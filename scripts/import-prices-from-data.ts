/**
 * Import part prices into BaseBomItems from the hardcoded price data.
 * Matches by normalised description (fuzzy).
 * Also sets stockCode on matched items.
 *
 * Usage: npx tsx scripts/import-prices-from-data.ts [--dry-run]
 */
import "dotenv/config"
import { prisma } from "../src/lib/db"
// Use string-based Decimal via Prisma

// Full price dataset from import-part-prices.js
const RAW_PRICES = `DXF-0000-00-DFD;Double Flood Door DXF Pack;RM-LP;EA;1290.01;;EA;Laser Profiling Limited;15
DXF-0000-00-DFDC5;Double Flood Door C5 DXF Pack;RM-LP;EA;1874.45;;EA;Laser Profiling Limited;15
DXF-0000-00-SFD;Single Flood Door DXF Pack;RM-LP;EA;773.46;;EA;Laser Profiling Limited;15
DXF-0000-00-SFDC5;Single Flood Door C5 DXF Pack;RM-LP;EA;1266.76;;EA;Laser Profiling Limited;15
FD-0003-FP;Trip Plate - 4 mm;RM-PP;EA;1.89;;EA;FC Laser Limited;15
FD-0005-FP;P Frame Cap - 3 mm;RM-PP;EA;1.24;;EA;Laser Profiling Limited;15
FD-0006-FP;Centre Post Cap - 47x47x5mm;RM-PP;EA;0.91;;EA;Laser Profiling Limited;15
FD-0007-FP;Centre Post Flange - 60x33x6mm;RM-PP;EA;5.43;;EA;Laser Profiling Limited;15
FD-0008-MP;Spring Collar - 30/17x10;RM-PP;EA;7.20;;EA;BPM Engineering;15
FD-0009-FP;P Frame Corner Closer - 3 mm;RM-PP;EA;0.00;not used;EA;;
FD-0011-FP;Rose for Pull Handle - S/S - 14 x 225mm;RM-PP;EA;6.00;;EA;Laser Profiling Limited;15
FD-0015-FP;Security Door Cylinder Guard Tube;RM-PP;EA;0.91;;EA;Laser Profiling Limited;15
FD-0026-FP;Hinge Shroud C5 - 6 mm;RM-PP;EA;1.83;;EA;FC Laser Limited;15
FD-0027-MP;Dog Bolt;RM-PP;EA;4.00;;EA;Foredowel;15
FD-0037-FP;Lock Fixing Plate Rear - 5mm;RM-PP;EA;7.55;;EA;Laser Profiling Limited;15
FD-0038-FP;Hatch Lock Plate Front - 6mm;RM-PP;EA;5.40;;EA;Laser Profiling Limited;15
FD-0039-FP;Hatch Lock Plate Rear - 6mm;RM-PP;EA;7.19;;EA;Laser Profiling Limited;15
FD-0040-FP;Lock Fixing Plate Front - 5mm;RM-PP;EA;4.18;;EA;Lasershape Ltd;15
FD-0041-FP;Universal Door Closer Bracket Fire - 5 mm;RM-PP;EA;20.00;;EA;Laser Profiling Limited;15
FG-0104-FP;Earthing Lug - 50 mm x 50 mm x 10 mm;RM-PP;EA;2.74;;EA;Laser Profiling Limited;15
PP-DF-0001-1;HD Bullet Hinge - Top;RM-PP;EA;6.00;;EA;ACCU LIMITED;25
PP-DF-0001-2;HD Bullet Hinge - Bottom;RM-PP;EA;6.00;;EA;ACCU LIMITED;25
PP-DF-0001-3;HD Bullet Hinge - Washer 22 mm x 2 mm;RM-PP;EA;0.45;;EA;ACCU LIMITED;25
PP-DF-0010;Compression Spring - S/S - 2.03x150FLx16.5IDx19.5TC;RM-PP;EA;1.53;;EA;Leeming and Peel Ltd;25
PP-DF-0011;Lock Pin & Chain - K0365.102306030/K1125.01X160;RM-PP;EA;4.42;;EA;Good Hand (UK) Ltd;25
PP-DF-0015;LCN 4040XP Door Closer - Universal;RM-PP;EA;153.00;;EA;RELCROSS DOOR CONTROLS;5
PP-DF-0017;GSS3E80 Cylinder Guard - S.McGill - Europrofile;RM-PP;EA;173.88;;EA;Surelock McGill;5
PP-DF-0033;GMS3E60 Cylinder Guard - S.McGill;RM-PP;EA;173.88;;EA;Surelock McGill;5
PP-DF-0037;Good Hand Chain - K1125.01X160;RM-PP;EA;2.41;;EA;Good Hand (UK) Ltd;5
PP-DF-0048;Dorma TS83 BC EN 3-6 Door Closer - Universal;RM-PP;EA;116.00;;EA;Door Controls Direct;3
PP-DF-0052;Toggle Clamp - Good Hand GH-22502-B;RM-PP;EA;18.45;;EA;Good Hand (UK) Ltd;3
PP-DF-0063;Pull Handle - S/S - 14 x 225mm;RM-PP;EA;6.00;;EA;;3
PP-FIX-M10-0001;M10 x 100 Thunder Bolt - BZP (Blue Tip);RM-PP;EA;0.72;;B100;Celtic Industrial Fasteners;3
PP-FIX-M12-0001;M12 x 35 Hex Head Bolt - A2;RM-PP;EA;1.32;;B100;ACCU LIMITED;2
PP-FIX-M12-0003;M12 x 160 A2 Resin Anchor Studs;RM-PP;EA;2.10;;B10;Celtic Industrial Fasteners;2
PP-FIX-M12-0004;M12 Hex Nut - A2;RM-PP;EA;0.18;;EA;Celtic Industrial Fasteners;2
PP-FIX-M12-0005;M12 Washer - A2;RM-PP;EA;0.07;;B100;ACCU LIMITED;2
PP-FIX-M12-0019;M12 Flanged Hex Nut - A2;RM-PP;EA;0.26;;B100;Celtic Industrial Fasteners;2
PP-FIX-M16-0002;M16 x 35 Hex Head Bolt - A2;RM-PP;EA;0.94;;B100;Celtic Industrial Fasteners;2
PP-FIX-M16-0003;M16 Washer - A2;RM-PP;EA;0.18;;B100;ACCU LIMITED;2
PP-FIX-M16-0004;M16 Washer - BZP;RM-PP;EA;0.18;;B100;ACCU LIMITED;2
PP-FIX-M16-0005;M16 Nyloc Nut - A2;RM-PP;EA;0.39;;B100;Celtic Industrial Fasteners;2
PP-FIX-M16-0007;M16 Hex Nut - BZP;RM-PP;EA;0.16;;B100;ACCU LIMITED;2
PP-FIX-M16-0010;M16 x 190 Anchor Stud Bolts - A2;RM-PP;EA;6.35;;EA;Celtic Industrial Fasteners;2
PP-FIX-M16-0011;M16 x 70 Cap Head Bolts (Self Colour);RM-PP;EA;2.71;;B100;ACCU LIMITED;2
PP-FIX-M16-0026;M16x50 Hex Head Bolt - BZP;RM-PP;EA;0.80;;B100;ACCU LIMITED;2
PP-FIX-M16-0030;M16 Flanged Hex Nut - A2;RM-PP;EA;0.83;;B100;;2
PP-FIX-M18-0001;M18x30 Hex Head Bolt - A2;RM-PP;EA;3.66;;EA;ACCU LIMITED;2
PP-FIX-M20-0002;M20 x 50 Hex Head Bolt - A2;RM-PP;EA;2.36;;EA;ACCU LIMITED;2
PP-FIX-M20-0003;M20 Washer - A2;RM-PP;EA;0.16;;B100;Celtic Industrial Fasteners;2
PP-FIX-M20-0005;M20 Hex Nut - A2;RM-PP;EA;0.60;;B100;Celtic Industrial Fasteners;2
PP-FIX-M20-0007;M20 x 200 Threaded Bar - A2;RM-PP;EA;14.95;;EA;Celtic Industrial Fasteners;2
PP-FIX-M20-0009;M20x60 Hex Head Bolt - A2;RM-PP;EA;1.75;;B100;Celtic Industrial Fasteners;2
PP-FIX-M20-0010;M20 x 215 Throughbolt - BZP;RM-PP;EA;2.27;;B100;Celtic Industrial Fasteners;2
PP-FIX-M20-0029;M20 Washer (A2) ISO7093-1;RM-PP;EA;0.82;;B100;;2
PP-FIX-M4-0001;M4 x 16 Button Head Bolt - A2;RM-PP;EA;0.04;;EA;ACCU LIMITED;2
PP-FIX-M5-0006;M5 x 10 C'sk Head Cap Screw - A2;RM-PP;EA;0.18;;B100;;2
PP-FIX-M5-0009;M5 x 50 C'sk Head Cap Screw - A2;RM-PP;EA;0.18;;B100;Celtic Industrial Fasteners;2
PP-FIX-M6-0001;M6x16 Button Head Bolt - A2;RM-PP;EA;0.23;;B100;ACCU LIMITED;2
PP-FIX-M6-0004;M6 Washer - A2;RM-PP;EA;0.06;;B100;ACCU LIMITED;2
PP-FIX-M6-0006;M6x1- Grease Nipple - A2;RM-PP;EA;2.20;;B100;Celtic Industrial Fasteners;2
PP-FIX-M6-0011;M6 x 16 C'sk Head Cap Screw - A2;RM-PP;EA;0.06;;B100;Celtic Industrial Fasteners;2
PP-FIX-M6-0012;M6 x 20 Hex Socket Cap Head Bolt -A2;RM-PP;EA;10.25;;EA;Celtic Industrial Fasteners;2
PP-FIX-M6-0018;M6 x 8 Torx Button Head Bolt - A4;RM-PP;EA;0.20;;B100;ACCU LIMITED;2
PP-FIX-M6-0019;M6 x 6 Hexagon Socket Grub Screw - A2;RM-PP;EA;0.05;;EA;ACCU LIMITED;2
PP-FIX-M6-0021;M6 Washer - A4;RM-PP;EA;0.04;;B100;ACCU LIMITED;2
PP-FIX-M6-0023;M6x10 CSK Bolt - A2;RM-PP;EA;0.06;;B100;Celtic Industrial Fasteners;2
PP-FIX-M6-0030;M6 x 16 Torx Button Head Bolt -A2;RM-PP;EA;0.22;;EA;ACCU LIMITED;2
PP-FIX-M8-0001;M8 x 20 Button Head Bolt - A2;RM-PP;EA;0.17;;B100;ACCU LIMITED;2
PP-FIX-M8-0002;M8 x 30 Button Head Bolt - A2;RM-PP;EA;0.15;;B100;Celtic Industrial Fasteners;2
PP-FIX-M8-0003;M8 x 50 C'sk Head Cap Screw - A2;RM-PP;EA;0.29;;B100;Celtic Industrial Fasteners;2
PP-FIX-M8-0006;M8 Washer - A2;RM-PP;EA;0.04;;B100;ACCU LIMITED;2
PP-FIX-M8-0015;M8 Hex Nut - A2;RM-PP;EA;0.12;;B100;ACCU LIMITED;2
PP-FIX-M8-0028;M8x20 Torx Button Head Bolt - A2;RM-PP;EA;0.23;;EA;ACCU LIMITED;2
PP-SL216;S McGill - SL216-04-A5-D06-K0-W14-THUMBTURN CODE;RM-PP;EA;1401.74;;EA;Surelock McGill;2
PP-TY113;Tyne Mortice Lock - S.McGill;RM-PP;EA;822.47;;EA;Surelock McGill;2
PP-FG-0002;70mm Gate Hinge Oilite Bush - 32 OD x 25 ID x 30mm;RM-PP;EA;6.47;;EA;;3
PP-FG-0003;100mm Gate Hinge Oilite Bush - 41 OD x 35 ID x 35mm;RM-PP;EA;7.53;;EA;;3
PP-FG-0005;Flanged Oilite Bearing - 39x3.5 Flange x 30 OD x 25 ID x 32mm;RM-PP;EA;5.71;;EA;;3
PP-FG-0012;Pull Handle 19 x 300mm;RM-PP;EA;29.76;;EA;;3
PP-FG-0013;M8 Eyelet;RM-PP;EA;5.54;;B10;;3
PP-GLASS-0001;GFW-3PLY-SGP-Glass - XXXX x XXXX mm;RM-PP;EA;0.00;;EA;;2
RAW-CHS-0002;CHS 26.9 x 2mm;RM-EX;MM;14.70;;EA;Hall & Pickles;2
RAW-CHS-0005;CHS - 60.3 OD x 3.91mm Wall - 316;RM-EX;EA;0.70;;MM;;2
RAW-CHS-0006;CHS - 30 OD x 2mm Wall - 316;RM-EX;MM;0.20;;MM;;2
RAW-FB-0003;FB - 50x8mm - S275;RM-EX;MM;2.46;;M;AJN STEELSTOCK LIMITED;2
RAW-FB-0004;FB - 80x8mm - S275;RM-EX;MM;3.93;;M;AJN STEELSTOCK LIMITED;2
RAW-FB-0007;FB - 200x10mm - 304;RM-EX;MM;47.00;;M;AALCO;2
RAW-HINGE-0001;Piano Hinge 4.7 x 51 x 2mm - SS304;RM-PP;MM;19.50;;M;;2
RAW-MILLSTOCK-0001;H-Section Mid Post - 120x76mm;RM-EX;M;242.00;;M;Millstock Stainless Limited;2
RAW-MILLSTOCK-0004;Corner Post - 90 deg;RM-EX;M;1662.50;;M;Millstock Stainless Limited;2
RAW-MILLSTOCK-XXXX;Angled Mid Post - XXX deg;RM-EX;M;0.00;;EA;;2
RAW-RB-0001;RB - 18mm;RM-EX;MM;11.30;;L3.00;AALCO;2
RAW-RHS-0002;RHS 50x30x3mm;RM-EX;MM;2.47;;M;AJN STEELSTOCK LIMITED;2
RAW-RHS-0003;RHS - 100x50x5 - S355;RM-EX;MM;72.50;;L7.50;AJN STEELSTOCK LIMITED;2
RAW-RHS-0007;RHS - 200x100x8mm - S355;RM-EX;MM;32.67;;L7.50;AJN STEELSTOCK LIMITED;2
RAW-RSA-0003;RSA - 100x50x8mm - S275;RM-EX;MM;55.00;;L6.10;AJN STEELSTOCK LIMITED;2
RAW-RSA-0004;RSA - 100x100x10mm - S275;RM-EX;MM;12.50;;L6.00;AJN STEELSTOCK LIMITED;2
RAW-RSC-0002;RSC - 76x38x6.7mm - S355;RM-EX;MM;6.23;;L6.10;AJN STEELSTOCK LIMITED;2
RAW-SB-0003;8mm SQ Bar - S235;RM-EX;MM;1.98;;L3.00;Express Metal Services Limited;2
RAW-SEAL-0001;62x27 Closed Cell EPDM with 2mm Neoprene Skin;RM-EX;M;51.64;;M;;2
RAW-SEAL-0002;62x47 Closed Cell EPDM with 2mm Neoprene Skin;RM-EX;M;62.84;;M;;2
RAW-SFP-0001;P Frame - 3 mm;RM-EX;MM;49.50;;M;FC Laser Limited;2
RAW-SFP-0002;P Frame Closer - 100 mm x 3 mm;RM-EX;MM;19.14;;M;FC Laser Limited;2
RAW-SHS-0001;SHS 50x50x3mm;RM-EX;MM;32.00;;M;AJN STEELSTOCK LIMITED;2
RAW-SHS-0003;SHS 60x60x6mm;RM-EX;MM;85.00;;M;AJN STEELSTOCK LIMITED;2
RAW-SHS-0004;SHS - 70x70x5mm - S355;RM-EX;MM;8.87;;L7.50;AJN STEELSTOCK LIMITED;2
RAW-SHS-0005;SHS - 100x100x5 - S355;RM-EX;MM;13.00;;L7.50;AJN STEELSTOCK LIMITED;2
RAW-UC-0001;203UC46 - S355;RM-EX;MM;34.43;;L6.10;AJN STEELSTOCK LIMITED;2
SEAL-0009;Intumescent Tape - 15mm x 2mm;RM-EX;MM;2.36;;M;KuhnOdice;2
SEAL-0017;38x35mm Grey Closed-cell FR Neoprene/EPDM;RM-EX;M;3.51;;M;RH Nuttall;2
SEAL-0031;38x35mm @ Plain Black A320 Closed Cell Neoprene/EPDM;RM-EX;M;1.99;;M;ADVANCED SEALS AND GASKETS LIMITED;2
FG-0001-MP;70mm Gate Hinge Pin - 25x140mm Shaft;RM-MP;EA;135.00;;EA;BPM Engineering;15
FG-0002-MP;70mm Gate Hinge Barrel Housing - 60x80mm;RM-MP;EA;125.00;;EA;BPM Engineering;15
FG-0003-MP;70mm Gate Hinge Washer - 40 OD x 25,2 ID x 5mm;RM-MP;EA;20.00;;EA;BPM Engineering;15
FG-0004-FP;70mm Gate Hinge Plate to Jamb - 15mm;RM-LP;EA;16.00;;EA;;15
FG-0005-FP;70mm Gate Hinge Backing Plate - 12mm;RM-LP;EA;6.40;;EA;;15
FG-0006-FP;70mm Gate Hinge Backing Plate - 12mm;RM-LP;EA;6.40;;EA;Laser Profiling Limited;15
FG-0007-FP;70mm Gate Hinge Stiffener - 10mm;RM-LP;EA;8.00;;EA;;15
FG-0008-FP;70mm Gate Hinge Plate to Jamb Lug - 15mm;RM-LP;EA;16.00;;EA;;15
FG-0009-FP;70mm Gate Hinge Plate to Leaf Lug - 15mm;RM-LP;EA;17.00;;EA;;15
FG-0010-MP;100mm Gate Hinge Pin - 34.4x205mm Shaft;RM-PP;EA;115.00;;EA;BPM Engineering;15
FG-0011-MP;100mm Gate Hinge Barrel Housing - 80x120mm;RM-PP;EA;69.25;;EA;BPM Engineering;15
FG-0012-MP;100mm Gate Hinge Washer - 50 OD x 35 ID x 5mm;RM-PP;EA;8.44;;EA;I & G Engineering Ltd;15
FG-0013-FP;100mm Gate Hinge Plate to Jamb - 15mm;RM-PP;EA;33.33;;EA;Laser Profiling Limited;15
FG-0014-FP;100mm Gate Hinge Plate to Leaf - 15mm;RM-PP;EA;25.91;;EA;Laser Profiling Limited;15
FG-0015-FP;100mm Gate Hinge Backing Plate - 15mm;RM-PP;EA;23.58;;EA;Laser Profiling Limited;15
FG-0016-FP;100mm Gate Hinge Stiffener - 10mm;RM-PP;EA;5.25;;EA;Laser Profiling Limited;15
FG-0017-FP;100mm Gate Hinge Plate to Jamb (Single) - 20mm;RM-PP;EA;16.77;;EA;Laser Profiling Limited;15
FG-0018-FP;100mm Gate Hinge Plate to Leaf Lug - 15mm;RM-PP;EA;9.65;;EA;Laser Profiling Limited;15
FG-0040-MP;Single Gate Spindle 25x300mm Shaft;RM-PP;EA;120.00;;EA;BPM Engineering;15
FG-0042-MP;Single Gate Pivot Block 40x50x90mm;RM-PP;EA;63.66;;EA;BPM Engineering;15
FG-0043-MP;Single Gate Pivot Block Cover 40x60x10mm;RM-PP;EA;26.44;;EA;I & G Engineering Ltd;15
FG-0044-MP;Single Gate Nut Housing 50x94mm;RM-PP;EA;37.97;;EA;I & G Engineering Ltd;15
FG-0045-MP;Single Gate Nut Core 42 OD x 50mm;RM-PP;EA;44.42;;EA;I & G Engineering Ltd;15
FG-0046-FP;Single Gate Pivot Bracket Fixing Plate - 10mm;RM-PP;EA;9.65;;EA;Laser Profiling Limited;15
FG-0047-FP;Single Gate Pivot Bracket Backing Plate - 10mm;RM-PP;EA;6.20;;EA;Laser Profiling Limited;15
FG-0048-FP;Single Gate Pivot Bracket Eye Tab - 10mm;RM-PP;EA;4.28;;EA;Laser Profiling Limited;15
FG-0049-FP;Single Gate Cradle Plate - 15mm;RM-PP;EA;6.02;;EA;Laser Profiling Limited;15
FG-0050-FP;Single Gate Jamb Box - 5mm;RM-PP;EA;43.61;;EA;Laser Profiling Limited;15
FG-0051-FP;Single Gate Jamb Cover Flap - 5mm;RM-PP;EA;31.35;;EA;Laser Profiling Limited;15
FG-0052-FP;Single Gate Leaf Cover Flap - 5mm;RM-PP;EA;18.08;;EA;Laser Profiling Limited;15
FG-0053-FP;Single Gate Cover Locking Tab - 5mm;RM-PP;EA;1.01;;EA;Laser Profiling Limited;15
FG-0069-MP;Pedestrian Gate External Handle;RM-MP;EA;185.00;;EA;;15
FG-0070-MP;Pedestrian Gate Latch Collar;RM-MP;EA;0.00;;EA;;15
FG-0071-MP;Pedestrian Gate Latch Nylon Bush;RM-MP;EA;2.00;;EA;;15
FG-0072-MP;Pedestrian Gate Latch Housing;RM-MP;EA;40.00;;EA;;15
FG-0073-MP;Pedestrian Gate Latch Drive Block;RM-MP;EA;110.00;;EA;;15
FG-0074-MP;Pedestrian Gate Internal Handle;RM-MP;EA;45.00;;EA;;15
FG-0075-FP;Pedestrian Gate Latch Wedge - 10mm;RM-LP;EA;7.00;;EA;;15
FG-0076-FP;Pedestrian Gate Latch Wedge Cover - 3mm;RM-LP;EA;10.00;;EA;;15
FG-0077-FP;Pedestrian Gate Handle Locking Lug - 10mm;RM-LP;EA;1.00;;EA;;15
FG-0078-FP;Pedestrian Gate Leaf Locking Lug - 10mm;RM-LP;EA;5.00;;EA;;15
FG-0079-FP;Pedestrian Gate Latch Drive Stop Tab - 5mm;RM-LP;EA;0.88;;EA;Laser Profiling Limited;15
FG-0080-FP;Pedestrian Gate Latch Housing Stop Tab - 5mm;RM-LP;EA;0.95;;EA;;15
FG-0102-FP;M20 Lifting Eye Plate - 80x80 - 15mm;RM-LP;EA;8.00;;EA;FC Laser Limited;15
FG-0103-FP;M20 Lifting Eye Plate - 50x50 - 15mm;RM-LP;EA;4.19;;EA;Laser Profiling Limited;15
FG-0104-FP;Earthing Tab - 50x50 - 10mm;RM-LP;EA;2.74;;EA;Laser Profiling Limited;15
FG-0105-FP;Ped Gate Transport Bar Tab - 8mm;RM-LP;EA;0.00;;EA;;15
FG-0106-FP;Anchor Plate - 80x80 - 10mm;RM-LP;EA;3.35;;EA;Laser Profiling Limited;15
FG-0108-FP;UC Support Plate - 10 mm;RM-LP;EA;2.64;;EA;Onesite Laser;15
FG-0109-FP;Threshold Support Plate - 10 mm;RM-LP;EA;7.28;;EA;Laser Profiling Limited;15
FG-0112-FP;Seal Channel Capping Plate - 76x38 - 5mm;RM-LP;EA;0.22;;EA;Onesite Laser;15
FG-0129-FP;Single Gate Face Fixed Pivot Bracket Fixing Plate - 10mm;RM-LP;EA;0.00;;EA;;15
FG-0135-FP;Face Fixed Receiver Plate - 10mm;RM-LP;EA;0.00;;EA;;15
FG-0136-FP;Single Gate Cradle Plate (SS316) - 15mm;RM-LP;EA;0.00;;EA;;15
FG-0139-FP;Single Gate Face Fixed Mechanism Cover Plate - 5mm;RM-LP;EA;0.00;;EA;;15
FG-0140-FP;Single Gate Face Fixed Mechanism Cover Cap - 2mm;RM-LP;EA;0.00;;EA;;15
BASE-FGW-0009-FP;Base Seal End Post - 5mm;RM-LP;EA;5.00;;EA;;
BASE-FGW-0011-FP;Corner Post Base Seal - 5mm;RM-LP;EA;0.00;;EA;;
DXF-0000-00-01-FGW_Angled_Post;Flood Glazing Angled Post DXF Pack;RM-LP;EA;0.00;;EA;;10
DXF-0000-00-01-FGW_Corner_Post;Flood Glazing Corner Post DXF Pack;RM-LP;EA;0.00;;EA;;10
DXF-0000-00-01-FGW_Mid_Post;Flood Glazing Mid Post DXF Pack;RM-LP;EA;0.00;;EA;;10
DXF-0000-00-01-FGW_Panel;Flood Glazing Panel DXF Pack;RM-LP;EA;0.00;;EA;;10
DXF-0000-00-FGW;Flood Glazing DXF Pack;RM-LP;EA;0.00;;EA;;10
DXF-0000-00-FGW_End_Post;Flood Glazing End Post DXF Pack;RM-LP;EA;0.00;;EA;;10
FGW-0001-FP;Baseplate Wet - 20mm;RM-LP;EA;23.69;;EA;;15
FGW-0002-FP;Baseplate Dry - 20mm;RM-LP;EA;13.04;;EA;;15
FGW-0003-FP;Finplate Wet - 10mm;RM-LP;EA;18.65;;EA;;15
FGW-0004-FP;Finplate Dry - 10mm;RM-LP;EA;23.69;;EA;;15
FGW-0005-FP;Capping Fixing Strip - 6mm;RM-LP;EA;6.63;;EA;;15
FGW-0006-FP;Mid Post Cap - 1.5mm;RM-LP;EA;5.65;;EA;;15
FGW-0007-FP;End Post Cap - 1.5mm;RM-LP;EA;3.82;;EA;;15
FGW-0008-FP;Capping Fixing Strip (End Post) - 6mm;RM-LP;EA;5.80;;EA;;15
FGW-0010-FP;Baseplate End Post - 20 mm;RM-LP;EA;15.60;;EA;;15
FGW-0012-FP;Base Seal Mid Post - 5mm;RM-LP;EA;6.00;;EA;;15
FGW-0013-FP;Baseplate Corner-01 - 20 mm;RM-LP;EA;0.00;;EA;;15
FGW-0014-FP;Baseplate Corner-02 - 20 mm;RM-LP;EA;0.00;;EA;;15
PP-FIX-M6-0018;M6 x 8 Torx Button Head Bolt - A4;RM-PP;EA;0.20;;B100;ACCU LIMITED;2
PP-FIX-M6-0021;M6 Washer - A4;RM-PP;EA;0.04;;B100;ACCU LIMITED;2
RAW-SEAL-0010;Self Adhesive Closed Cell Seal - 35x12mm;RM-EX;M;4.68;;EA;;2
RAW-SEAL-0045;Self Adhesive Closed Cell Seal - 40x30mm;RM-EX;M;10.50;;EA;;2`

interface PriceEntry {
  stockCode: string
  description: string
  category: string
  unitOfMeasure: string
  price: number
  supplier: string
  leadTime: number
}

function parsePrices(): PriceEntry[] {
  return RAW_PRICES.trim().split("\n").map((line) => {
    const parts = line.split(";")
    return {
      stockCode: parts[0]?.trim() || "",
      description: parts[1]?.trim() || "",
      category: parts[2]?.trim() || "",
      unitOfMeasure: parts[3]?.trim() || "",
      price: parseFloat(parts[4]?.trim() || "0") || 0,
      supplier: parts[7]?.trim() || "",
      leadTime: parseInt(parts[8]?.trim() || "0") || 0,
    }
  })
}

/** Normalise a description for fuzzy matching */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // strip all non-alphanumeric
}

/** Check if two normalised strings are close enough */
function fuzzyMatch(bomDesc: string, priceDesc: string): boolean {
  const a = normalise(bomDesc)
  const b = normalise(priceDesc)
  // Exact normalised match
  if (a === b) return true
  // One contains the other
  if (a.includes(b) || b.includes(a)) return true
  return false
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const prices = parsePrices()

  console.log(`Parsed ${prices.length} price entries`)
  if (dryRun) console.log("*** DRY RUN — no changes will be made ***\n")

  const allBomItems = await prisma.baseBomItem.findMany({
    select: { id: true, description: true, stockCode: true, unitCost: true, variantId: true },
  })

  console.log(`Total BOM items in database: ${allBomItems.length}\n`)

  let updated = 0
  let matched = 0
  let noMatch = 0
  const unmatched: string[] = []

  // For each BOM item, try to find a price match
  for (const item of allBomItems) {
    // Try stock code first (if item has one)
    let priceEntry: PriceEntry | undefined
    if (item.stockCode) {
      priceEntry = prices.find((p) => p.stockCode === item.stockCode)
    }

    // Fall back to fuzzy description match
    if (!priceEntry) {
      priceEntry = prices.find((p) => fuzzyMatch(item.description, p.description))
    }

    if (priceEntry) {
      matched++
      const needsUpdate = Number(item.unitCost) !== priceEntry.price || item.stockCode !== priceEntry.stockCode

      if (needsUpdate) {
        if (!dryRun) {
          await prisma.baseBomItem.update({
            where: { id: item.id },
            data: {
              unitCost: priceEntry.price,
              stockCode: priceEntry.stockCode,
            },
          })
        }
        updated++
        console.log(`  ✓ ${item.description} → £${priceEntry.price.toFixed(2)} [${priceEntry.stockCode}]`)
      }
    } else {
      noMatch++
      if (!unmatched.includes(item.description)) {
        unmatched.push(item.description)
      }
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Matched: ${matched} BOM items`)
  console.log(`Updated: ${updated} BOM items ${dryRun ? "(would update)" : ""}`)
  console.log(`Unmatched: ${noMatch} BOM items`)
  console.log(`Unique unmatched descriptions: ${unmatched.length}`)

  if (unmatched.length > 0) {
    console.log(`\n--- Unmatched descriptions (need manual pricing) ---`)
    for (const d of unmatched.sort()) {
      console.log(`  • ${d}`)
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})

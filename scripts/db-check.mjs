import pkg from '../src/generated/prisma/client/default.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  console.log('Projects:', await prisma.project.count());
  console.log('Opportunities:', await prisma.opportunity.count());
  console.log('Quotes:', await prisma.quote.count());
  console.log('Customers:', await prisma.customer.count());
  console.log('Suppliers:', await prisma.supplier.count());
  console.log('PurchaseOrders:', await prisma.purchaseOrder.count());
  console.log('SageStockItems:', await prisma.sageStockItem.count());
  console.log('SageBomHeaders:', await prisma.sageBomHeader.count());
  console.log('SageBomComponents:', await prisma.sageBomComponent.count());
  console.log('Users:', await prisma.user.count());
  console.log('DesignCards:', await prisma.designCard.count());
  console.log('ProductionTasks:', await prisma.productionTask.count());
  console.log('NCRs:', await prisma.nCR.count());
  console.log('SalesInvoices:', await prisma.salesInvoice.count());

  const projects = await prisma.project.findMany({ select: { projectNumber: true, name: true }, orderBy: { projectNumber: 'asc' }, take: 10 });
  console.log('\n--- PROJECTS ---');
  projects.forEach(p => console.log(p.projectNumber + ' | ' + p.name));

  const custs = await prisma.customer.findMany({ select: { name: true, accountCode: true }, take: 5, orderBy: { name: 'asc' } });
  console.log('\n--- CUSTOMERS ---');
  custs.forEach(c => console.log((c.accountCode||'none') + ' | ' + c.name));

  const supps = await prisma.supplier.findMany({ select: { name: true, accountCode: true }, take: 5, orderBy: { name: 'asc' } });
  console.log('\n--- SUPPLIERS ---');
  supps.forEach(s => console.log((s.accountCode||'none') + ' | ' + s.name));

  await prisma.$disconnect();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

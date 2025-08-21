import { PrismaClient, UserRole, LicenseStatus, TaskStatus, TaskType, Priority, AmlStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Vendor user
  const vendorPassword = await bcrypt.hash('vendor123', 12);
  const vendor = await prisma.user.create({
    data: {
      email: 'vendor@zaldo.no',
      passwordHash: vendorPassword,
      name: 'System Vendor',
      role: UserRole.Vendor,
      licenseId: '00000000-0000-0000-0000-000000000000', // Dummy license for vendor
    },
  });

  console.log('✅ Created vendor user');

  // Create Demo License
  const license = await prisma.license.create({
    data: {
      companyName: 'Demo Byrå AS',
      orgNumber: '987654321',
      employeeLimit: 5,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      status: LicenseStatus.Active,
    },
  });

  console.log('✅ Created demo license');

  // Create License Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const licenseAdmin = await prisma.user.create({
    data: {
      email: 'admin@demobyraa.no',
      passwordHash: adminPassword,
      name: 'Demo Administrator',
      role: UserRole.LicenseAdmin,
      licenseId: license.id,
      mfaEnabled: false,
    },
  });

  // Update license with admin user
  await prisma.license.update({
    where: { id: license.id },
    data: { adminUserId: licenseAdmin.id },
  });

  console.log('✅ Created license admin');

  // Create Employees
  const employee1Password = await bcrypt.hash('emp123', 12);
  const employee1 = await prisma.user.create({
    data: {
      email: 'ansatt1@demobyraa.no',
      passwordHash: employee1Password,
      name: 'Kari Ansatt',
      role: UserRole.Employee,
      licenseId: license.id,
      mfaEnabled: false,
    },
  });

  const employee2Password = await bcrypt.hash('emp456', 12);
  const employee2 = await prisma.user.create({
    data: {
      email: 'ansatt2@demobyraa.no',
      passwordHash: employee2Password,
      name: 'Ole Regnskapsfører',
      role: UserRole.Employee,
      licenseId: license.id,
      mfaEnabled: true,
    },
  });

  console.log('✅ Created employees');

  // Create Demo Clients
  const client1 = await prisma.client.create({
    data: {
      licenseId: license.id,
      name: 'Eksempel Butikk AS',
      orgNumber: '123456789',
      orgForm: 'AS',
      email: 'post@eksempelbutikk.no',
      phone: '+47 12345678',
      address: 'Storgata 1',
      postalCode: '0001',
      city: 'Oslo',
      naceCode: '47110',
      naceText: 'Butikkhandel med bredt vareutvalg ellers',
      accountingSystem: 'fiken',
      notes: 'Demo klient for testing',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      licenseId: license.id,
      name: 'Tech Startup ENK',
      orgNumber: '987654320',
      orgForm: 'ENK',
      email: 'kontakt@techstartup.no',
      phone: '+47 87654321',
      address: 'Innovasjonsveien 5',
      postalCode: '1234',
      city: 'Bergen',
      naceCode: '62010',
      naceText: 'Programmering',
      accountingSystem: 'tripletex',
      notes: 'Ny teknologi startup',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      licenseId: license.id,
      name: 'Rådgiving Norge AS',
      orgNumber: '555123456',
      orgForm: 'AS',
      email: 'post@raadgiving.no',
      phone: '+47 55512345',
      address: 'Konsulentgata 10',
      postalCode: '5678',
      city: 'Trondheim',
      naceCode: '70220',
      naceText: 'Bedriftsrådgivning og annen administrativ rådgivning',
      accountingSystem: 'poweroffice',
      notes: 'Etablert rådgivningsselskap',
    },
  });

  console.log('✅ Created demo clients');

  // Create Client Responsibles
  await prisma.clientResponsible.createMany({
    data: [
      {
        clientId: client1.id,
        name: 'Ola Nordmann',
        title: 'Daglig leder',
        email: 'ola@eksempelbutikk.no',
      },
      {
        clientId: client2.id,
        name: 'Kari Tekniker',
        title: 'CTO',
        email: 'kari@techstartup.no',
      },
      {
        clientId: client3.id,
        name: 'Per Konsulent',
        title: 'Partner',
        email: 'per@raadgiving.no',
      },
    ],
  });

  console.log('✅ Created client responsibles');

  // Create AML Statuses
  await prisma.amlStatus.createMany({
    data: [
      {
        clientId: client1.id,
        status: AmlStatus.Verified,
        lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        verifiedRef: 'AML-2024-001',
        nextDueAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000), // ~11 months from now
      },
      {
        clientId: client2.id,
        status: AmlStatus.InProgress,
      },
      {
        clientId: client3.id,
        status: AmlStatus.NotStarted,
      },
    ],
  });

  console.log('✅ Created AML statuses');

  // Create Default Tasks for each client
  const defaultTasks = [
    { title: 'Bokføring', description: 'Månedlig bokføring av bilag', type: TaskType.Standard },
    { title: 'MVA', description: 'Merverdiavgift rapportering', type: TaskType.Standard },
    { title: 'Lønn', description: 'Lønnkjøring og rapportering', type: TaskType.Standard },
    { title: 'Bankavstemming', description: 'Avstemming av bankkonti', type: TaskType.Standard },
    { title: 'Kontoavstemming', description: 'Avstemming av balansekonti', type: TaskType.Standard },
  ];

  const specialTasks = [
    { 
      title: 'Aksjonærregister', 
      description: 'Oppdatering av aksjonærregister',
      type: TaskType.Special,
      dueDate: new Date(new Date().getFullYear(), 11, 1), // December 1
    },
    { 
      title: 'Skattemelding', 
      description: 'Innlevering av skattemelding',
      type: TaskType.Special,
      dueDate: new Date(new Date().getFullYear() + 1, 4, 31), // May 31 next year
    },
    { 
      title: 'Årsoppgjør', 
      description: 'Årsoppgjør og årsberetning',
      type: TaskType.Special,
      dueDate: new Date(new Date().getFullYear() + 1, 6, 31), // July 31 next year
    },
  ];

  const clients = [client1, client2, client3];
  const employees = [employee1, employee2];

  for (const client of clients) {
    // Create standard tasks
    for (const taskTemplate of defaultTasks) {
      await prisma.task.create({
        data: {
          licenseId: license.id,
          clientId: client.id,
          title: taskTemplate.title,
          description: taskTemplate.description,
          type: taskTemplate.type,
          status: TaskStatus.Open,
          priority: Priority.Medium,
          assigneeUserId: employees[Math.floor(Math.random() * employees.length)].id,
        },
      });
    }

    // Create special tasks
    for (const taskTemplate of specialTasks) {
      await prisma.task.create({
        data: {
          licenseId: license.id,
          clientId: client.id,
          title: taskTemplate.title,
          description: taskTemplate.description,
          type: taskTemplate.type,
          status: TaskStatus.Open,
          priority: Priority.High,
          dueDate: taskTemplate.dueDate,
          assigneeUserId: employees[Math.floor(Math.random() * employees.length)].id,
        },
      });
    }
  }

  console.log('✅ Created default and special tasks');

  // Create some time entries
  const tasks = await prisma.task.findMany({
    where: { licenseId: license.id },
  });

  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 20; i++) {
    const randomDate = new Date(oneWeekAgo.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
    const randomHours = Math.random() * 8 + 0.5; // 0.5 to 8.5 hours

    await prisma.timeEntry.create({
      data: {
        licenseId: license.id,
        clientId: randomTask.clientId!,
        taskId: randomTask.id,
        userId: randomEmployee.id,
        hours: parseFloat(randomHours.toFixed(2)),
        workDate: randomDate,
        notes: `Arbeid med ${randomTask.title}`,
      },
    });
  }

  console.log('✅ Created time entries');

  // Create some notifications
  await prisma.notification.createMany({
    data: [
      {
        licenseId: license.id,
        userId: employee1.id,
        type: 'TaskReminder',
        payloadJson: {
          message: 'Du har 2 oppgaver som forfaller i morgen',
          taskCount: 2,
        },
        isRead: false,
      },
      {
        licenseId: license.id,
        type: 'AmlReminder',
        payloadJson: {
          message: 'AML-sjekk må utføres for 1 klient',
          clientCount: 1,
        },
        isRead: false,
      },
    ],
  });

  console.log('✅ Created notifications');

  // Create some feature flags
  await prisma.featureFlag.createMany({
    data: [
      {
        licenseId: license.id,
        flagKey: 'enable_advanced_reporting',
        flagValueJson: true,
      },
      {
        licenseId: license.id,
        flagKey: 'enable_ai_suggestions',
        flagValueJson: true,
      },
      {
        licenseId: license.id,
        flagKey: 'max_clients_per_user',
        flagValueJson: 50,
      },
    ],
  });

  console.log('✅ Created feature flags');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📧 Login credentials:');
  console.log('Vendor: vendor@zaldo.no / vendor123');
  console.log('License Admin: admin@demobyraa.no / admin123');
  console.log('Employee 1: ansatt1@demobyraa.no / emp123');
  console.log('Employee 2: ansatt2@demobyraa.no / emp456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
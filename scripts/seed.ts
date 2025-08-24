import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../server/auth';
import * as schema from '../shared/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clean existing data (in reverse dependency order)
    console.log('🧹 Cleaning existing data...');
    await db.delete(schema.timeEntries);
    await db.delete(schema.taskInstances);
    await db.delete(schema.taskTemplates);
    await db.delete(schema.clientTasks);
    await db.delete(schema.tasks);
    await db.delete(schema.clientResponsibles);
    await db.delete(schema.employees);
    await db.delete(schema.clients);
    await db.delete(schema.users);
    await db.delete(schema.tenants);

    // 1. Create test tenants (companies)
    console.log('🏢 Creating test tenants...');
    const [tenant1, tenant2] = await db.insert(schema.tenants).values([
      {
        name: 'Demo Regnskapsbyrå AS',
        orgNumber: '123456789',
        email: 'admin@demobyraa.no',
        phone: '+47 12345678',
        address: 'Testgata 1, 0123 Oslo',
        subscriptionPlan: 'professional',
        isActive: true
      },
      {
        name: 'System Owner Corp',
        orgNumber: '987654321',
        email: 'vendor@zaldo.no',
        phone: '+47 87654321',
        address: 'Vendor Street 1, 0124 Oslo',
        subscriptionPlan: 'enterprise',
        isActive: true
      }
    ]).returning();

    // 2. Create test users
    console.log('👥 Creating test users...');
    const hashedPassword = await hashPassword('password123');
    
    const [systemOwner, companyAdmin, employee1, employee2] = await db.insert(schema.users).values([
      {
        username: 'vendor@zaldo.no',
        email: 'vendor@zaldo.no',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Owner',
        role: 'admin', // Will be 'SYSTEM_OWNER' when implemented
        tenantId: tenant2.id,
        isActive: true
      },
      {
        username: 'admin@demobyraa.no',
        email: 'admin@demobyraa.no',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin', // Will be 'COMPANY_ADMIN' when implemented
        tenantId: tenant1.id,
        isActive: true
      },
      {
        username: 'ansatt1@demobyraa.no',
        email: 'ansatt1@demobyraa.no',
        password: hashedPassword,
        firstName: 'Ansatt',
        lastName: 'En',
        role: 'ansatt', // Will be 'COMPANY_USER' when implemented
        tenantId: tenant1.id,
        isActive: true
      },
      {
        username: 'ansatt2@demobyraa.no',
        email: 'ansatt2@demobyraa.no',
        password: hashedPassword,
        firstName: 'Ansatt',
        lastName: 'To',
        role: 'ansatt',
        tenantId: tenant1.id,
        isActive: true
      }
    ]).returning();

    // 3. Create test employees
    console.log('👨‍💼 Creating test employees...');
    const [emp1, emp2] = await db.insert(schema.employees).values([
      {
        tenantId: tenant1.id,
        firstName: 'Ansatt',
        lastName: 'En',
        email: 'ansatt1@demobyraa.no',
        phone: '+47 11111111',
        position: 'Regnskapsfører',
        department: 'Regnskap',
        startDate: '2024-01-01',
        salary: '450000',
        isActive: true
      },
      {
        tenantId: tenant1.id,
        firstName: 'Ansatt',
        lastName: 'To',
        email: 'ansatt2@demobyraa.no',
        phone: '+47 22222222',
        position: 'Senior Regnskapsfører',
        department: 'Regnskap',
        startDate: '2023-06-01',
        salary: '550000',
        isActive: true
      }
    ]).returning();

    // 4. Create test clients
    console.log('🏪 Creating test clients...');
    const [client1, client2] = await db.insert(schema.clients).values([
      {
        tenantId: tenant1.id,
        name: 'Innovative Tech AS',
        orgNumber: '111222333',
        address: 'Teknologigata 10',
        postalCode: '0156',
        city: 'Oslo',
        email: 'contact@innovativetech.no',
        phone: '+47 33333333',
        contactPerson: 'John Doe',
        accountingSystem: 'Fiken',
        engagementOwnerId: companyAdmin.id,
        responsiblePersonId: emp1.id,
        kycStatus: 'pending',
        amlStatus: 'pending',
        payrollRunDay: 25,
        payrollRunTime: '14:00',
        isActive: true
      },
      {
        tenantId: tenant1.id,
        name: 'Green Solutions Norge AS',
        orgNumber: '444555666',
        address: 'Miljøveien 5',
        postalCode: '0157',
        city: 'Oslo',
        email: 'info@greensolutions.no',
        phone: '+47 44444444',
        contactPerson: 'Jane Smith',
        accountingSystem: 'Tripletex',
        engagementOwnerId: companyAdmin.id,
        responsiblePersonId: emp2.id,
        kycStatus: 'approved',
        amlStatus: 'approved',
        payrollRunDay: 15,
        payrollRunTime: '12:00',
        isActive: true
      }
    ]).returning();

    // 5. Create test tasks
    console.log('📋 Creating test tasks...');
    await db.insert(schema.tasks).values([
      {
        tenantId: tenant1.id,
        clientId: client1.id,
        assignedTo: employee1.id,
        title: 'Månedlig bokføring - januar 2024',
        description: 'Gjennomføre månedlig bokføring for januar måned',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date('2024-02-10')
      },
      {
        tenantId: tenant1.id,
        clientId: client1.id,
        assignedTo: employee1.id,
        title: 'MVA-rapportering Q4 2023',
        description: 'Ferdigstille og sende inn MVA for 4. kvartal 2023',
        priority: 'high',
        status: 'overdue',
        dueDate: new Date('2024-01-31')
      },
      {
        tenantId: tenant1.id,
        clientId: client2.id,
        assignedTo: employee2.id,
        title: 'Lønnskjøring februar 2024',
        description: 'Gjennomføre lønnskjøring for februar måned',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date('2024-02-25')
      }
    ]);

    // 6. Create test time entries
    console.log('⏰ Creating test time entries...');
    await db.insert(schema.timeEntries).values([
      {
        tenantId: tenant1.id,
        userId: employee1.id,
        clientId: client1.id,
        description: 'Bokføring av januar-transaksjoner',
        timeSpent: '4.50',
        date: new Date('2024-01-15'),
        billable: true
      },
      {
        tenantId: tenant1.id,
        userId: employee1.id,
        clientId: client1.id,
        description: 'MVA-rapportering Q4',
        timeSpent: '2.25',
        date: new Date('2024-01-30'),
        billable: true
      },
      {
        tenantId: tenant1.id,
        userId: employee2.id,
        clientId: client2.id,
        description: 'Forberedelse til lønnskjøring',
        timeSpent: '1.75',
        date: new Date('2024-02-01'),
        billable: true
      },
      {
        tenantId: tenant1.id,
        userId: employee2.id,
        clientId: client2.id,
        description: 'Kundemøte - planlegging',
        timeSpent: '1.00',
        date: new Date('2024-02-02'),
        billable: false
      }
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Test data summary:');
    console.log(`- Tenants: 2 (${tenant1.name}, ${tenant2.name})`);
    console.log(`- Users: 4 (1 system owner, 1 admin, 2 employees)`);
    console.log(`- Employees: 2`);
    console.log(`- Clients: 2 (1 pending KYC/AML, 1 approved)`);
    console.log(`- Tasks: 3 (1 in progress, 1 overdue, 1 pending)`);
    console.log(`- Time entries: 4`);
    
    console.log('\n🔑 Test credentials:');
    console.log('System Owner: vendor@zaldo.no / password123');
    console.log('Company Admin: admin@demobyraa.no / password123');
    console.log('Employee 1: ansatt1@demobyraa.no / password123');
    console.log('Employee 2: ansatt2@demobyraa.no / password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('🌱 Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };
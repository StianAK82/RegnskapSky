import { db } from "../db";
import { clients, clientTasks, taskTemplates, tasks } from "../../shared/schema";
import { eq, and, lt, gte, sql } from "drizzle-orm";

export class TaskSchedulerService {
  private static instance: TaskSchedulerService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  static getInstance(): TaskSchedulerService {
    if (!TaskSchedulerService.instance) {
      TaskSchedulerService.instance = new TaskSchedulerService();
    }
    return TaskSchedulerService.instance;
  }

  // Starter scheduleren - sjekker oppgaver hvert minutt
  start(): void {
    if (this.isRunning) return;
    
    console.log('🚀 Task scheduler startet - sjekker oppgaver hvert minutt');
    this.isRunning = true;
    
    // Kjør første gang umiddelbart, deretter hvert minutt
    this.processRecurringTasks();
    this.intervalId = setInterval(() => {
      this.processRecurringTasks();
    }, 60000); // 60 sekunder
  }

  // Stopper scheduleren
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Task scheduler stoppet');
  }

  // Hovedfunksjonen som prosesserer alle gjentagende oppgaver
  async processRecurringTasks(): Promise<void> {
    try {
      console.log('🔄 Sjekker gjentagende oppgaver...', new Date().toLocaleString('nb-NO'));
      
      // Hent alle aktive klienter
      const activeClients = await db
        .select()
        .from(clients)
        .where(eq(clients.isActive, true));

      // Hent alle klientoppgaver som har frekvens satt
      const recurringTasks = await db
        .select({
          id: clientTasks.id,
          clientId: clientTasks.clientId,
          tenantId: clientTasks.tenantId,
          taskName: clientTasks.taskName,
          repeatInterval: clientTasks.repeatInterval,
          dueDate: clientTasks.dueDate,
          assignedTo: clientTasks.assignedTo,
          description: clientTasks.description
        })
        .from(clientTasks)
        .where(and(
          sql`${clientTasks.repeatInterval} IS NOT NULL`,
          sql`${clientTasks.repeatInterval} != ''`
        ));

      console.log(`📋 Fant ${recurringTasks.length} gjentagende oppgaver å prosessere`);

      // Prosesser hver gjentagende oppgave
      for (const recurringTask of recurringTasks) {
        await this.generateNextTaskInstance(recurringTask);
      }

    } catch (error) {
      console.error('❌ Feil i task scheduler:', error);
    }
  }

  // Generer neste oppgave-instans basert på frekvens
  private async generateNextTaskInstance(recurringTask: any): Promise<void> {
    try {
      const now = new Date();
      const lastDueDate = recurringTask.dueDate ? new Date(recurringTask.dueDate) : now;
      
      // Beregn neste forfallsdato basert på frekvens
      const nextDueDate = this.calculateNextDueDate(lastDueDate, recurringTask.repeatInterval);
      
      // Sjekk om vi skal opprette oppgaven nå
      if (nextDueDate <= now) {
        // Sjekk om oppgaven allerede finnes for denne datoen
        const existingTask = await db
          .select()
          .from(tasks)
          .where(and(
            eq(tasks.clientId, recurringTask.clientId),
            eq(tasks.title, recurringTask.taskName),
            sql`DATE(${tasks.dueDate}) = DATE(${nextDueDate})`
          ))
          .limit(1);

        if (existingTask.length === 0) {
          // Opprett ny oppgave
          await db.insert(tasks).values({
            tenantId: recurringTask.tenantId,
            clientId: recurringTask.clientId,
            assignedTo: recurringTask.assignedTo,
            title: recurringTask.taskName,
            description: recurringTask.description || `Gjentagende oppgave: ${recurringTask.taskName}`,
            priority: 'medium',
            status: 'pending',
            dueDate: nextDueDate
          });

          // Oppdater neste forfallsdato i client_tasks
          const newNextDueDate = this.calculateNextDueDate(nextDueDate, recurringTask.repeatInterval);
          await db
            .update(clientTasks)
            .set({ 
              dueDate: newNextDueDate,
              updatedAt: new Date()
            })
            .where(eq(clientTasks.id, recurringTask.id));

          console.log(`✅ Opprettet ny oppgave: ${recurringTask.taskName} for ${nextDueDate.toLocaleDateString('nb-NO')}`);
        }
      }
    } catch (error) {
      console.error(`❌ Feil ved generering av oppgave ${recurringTask.taskName}:`, error);
    }
  }

  // Beregn neste forfallsdato basert på frekvens
  private calculateNextDueDate(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);
    
    switch (frequency.toLowerCase()) {
      case 'daglig':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'ukentlig':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'månedlig':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case '2 vær mnd':
      case '2 vær måned':
        nextDate.setMonth(nextDate.getMonth() + 2);
        break;
      case 'kvartalsvis':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'årlig':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        // Som standard, legg til 1 måned
        nextDate.setMonth(nextDate.getMonth() + 1);
        console.log(`⚠️ Ukjent frekvens: ${frequency}, bruker månedlig som standard`);
    }
    
    return nextDate;
  }

  // Hent status for scheduleren
  getStatus(): { isRunning: boolean; nextCheck?: Date } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.isRunning ? new Date(Date.now() + 60000) : undefined
    };
  }
}
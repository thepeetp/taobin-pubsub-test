// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish (event: IEvent): void;
  subscribe (type: string, handler: ISubscriber): void;
  unsubscribe (type: string): void;
}

interface IRepository<T> {
  add(entitiy: T): void;
  find(id: string): T;
}


// implementations
class MachineRepository implements IRepository<Machine> {

  private _machines: Machine[] = []

  add(entitiy: Machine): void {
    this._machines.push(entitiy)
  }
  
  find(id: string): Machine {
    const machine = this._machines.find(machine => machine.id === id)
    if(machine) {
      return machine
    } else {
      throw new Error('Machine not found')
    }
  }

}


class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold
  }

  type(): string {
    return 'sale';
  }
}

class MachineRefillEvent implements IEvent {
  constructor(private readonly _refill: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  getRefillQuantity(): number {
    return this._refill
  }

  type(): string {
    return 'refill';
  }
}

class LowStockWarningEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  type(): string {
    return 'warning'
  }
  machineId(): string {
    return this._machineId;
  }
}

class StockLevelOkEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  type(): string {
    return 'warning'
  }
  machineId(): string {
    return this._machineId;
  }
}

class MachineSaleSubscriber implements ISubscriber {
  private _repository: MachineRepository
  private _pubSubService: IPublishSubscribeService

  constructor (repository: MachineRepository, pubSubService: IPublishSubscribeService) {
    this._repository = repository; 
    this._pubSubService = pubSubService;
  }

  handle(event: MachineSaleEvent): void {
    const machine = this._repository.find(event.machineId())
    machine.stockLevel -= event.getSoldQuantity()
    if(machine.stockLevel <= 3 && !machine.lowLevelWarned) {
      this._pubSubService.publish(new LowStockWarningEvent(machine.id))
      machine.lowLevelWarned = true
    }
  }
}

class MachineRefillSubscriber implements ISubscriber {
  private _repository: MachineRepository
  private _pubSubService: IPublishSubscribeService

  constructor (repository: MachineRepository, pubSubService: IPublishSubscribeService) {
    this._repository = repository;
    this._pubSubService = pubSubService;
  }


  handle(event: MachineRefillEvent): void {
    const machine = this._repository.find(event.machineId())
    machine.stockLevel += event.getRefillQuantity()
    if(machine.stockLevel >= 3 && machine.lowLevelWarned) {
      this._pubSubService.publish(new StockLevelOkEvent(machine.id))
      machine.lowLevelWarned = false
    }
  }
}

class StockWarningSubscriber implements ISubscriber {

  private _repository: MachineRepository

  constructor (repository: MachineRepository) {
    this._repository = repository; 
  }

  handle(event: LowStockWarningEvent | StockLevelOkEvent): void {
    if(event instanceof LowStockWarningEvent) {
      console.log(`Machine[${event.machineId()}] need to be refill`)
    } else if (event instanceof StockLevelOkEvent) {
      console.log(`Machine[${event.machineId()}] status is OK`)
    }
  }

}


class DefaultPublishSubscribeService implements IPublishSubscribeService {
  private _subscribers: Map<string, ISubscriber[]> = new Map();

  publish(event: IEvent): void {
    this._subscribers.get(event.type())?.forEach(subscriber => {
      console.log(event)
      subscriber.handle(event)
    })
  }
  subscribe(type: string, handler: ISubscriber): void {
    if (this._subscribers.has(type)) {
      this._subscribers.get(type)?.push(handler)
    } else {
      this._subscribers.set(type, [handler])
    }
  }

  unsubscribe(type: string): void {
    this._subscribers.delete(type)
  }
  
}


// objects
class Machine {
  public stockLevel = 5;
  public id: string;
  public lowLevelWarned: boolean = false;

  constructor (id: string) {
    this.id = id;
  }

  print() {
    console.log(`ID: ${this.id}, StockLevel: ${this.stockLevel}`);
  }
}


// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';

}

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  } 
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
}


// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [ new Machine('001'), new Machine('002'), new Machine('003') ];

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = new DefaultPublishSubscribeService(); // implement and fix this

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const machineRepository = new MachineRepository();
  const saleSubscriber = new MachineSaleSubscriber(machineRepository, pubSubService);
  const refillSubscriber = new MachineRefillSubscriber(machineRepository, pubSubService);
  const stockWarningSubscriber = new StockWarningSubscriber(machineRepository);

  // Store machine
  machines.forEach(machine => machineRepository.add(machine))

  // Register Event
  pubSubService.subscribe('sale', saleSubscriber)
  pubSubService.subscribe('refill', refillSubscriber)
  pubSubService.subscribe('warning', stockWarningSubscriber)

  // create 5 random events
  // const events = [1,2,3,4,5].map(i => eventGenerator());

  // Simulate Events to test Warning
  const events = [
    new MachineSaleEvent(2, '001'),
    new MachineSaleEvent(2, '001'),
    new MachineRefillEvent(2, '001'),
    new MachineRefillEvent(2, '001')
  ]

  // publish the events
  events.map(event => pubSubService.publish(event));
  machines.forEach(machine => machine.print());

  // test unsubscribe
  // pubSubService.unsubscribe('sale')
  // events.map(event => pubSubService.publish(event));
  // machines.forEach(machine => machine.print());
})();

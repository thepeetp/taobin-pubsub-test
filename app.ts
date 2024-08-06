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


// implementations
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

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor (machines: Machine[]) {
    this.machines = machines; 
  }

  handle(event: MachineSaleEvent): void {
    const machine = this.machines.find(machine => machine.id === event.machineId())
    if (machine) {
      machine.stockLevel -= event.getSoldQuantity()
    } else {
      throw new Error('Machine not found')
    }
  }
}

class MachineRefillSubscriber implements ISubscriber {
  public machines: Machine[];
  constructor (machines: Machine[]) {
    this.machines = machines; 
  }


  handle(event: MachineRefillEvent): void {
    const machine = this.machines.find(machine => machine.id === event.machineId())
    if (machine) {
      machine.stockLevel += event.getRefillQuantity()
    } else {
      throw new Error('Machine not found')
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
  public stockLevel = 10;
  public id: string;

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

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines);
  const refillSubscriber = new MachineRefillSubscriber(machines);

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = new DefaultPublishSubscribeService(); // implement and fix this
  pubSubService.subscribe('sale', saleSubscriber)
  pubSubService.subscribe('refill', refillSubscriber)

  // create 5 random events
  const events = [1,2,3,4,5].map(i => eventGenerator());

  // publish the events
  events.map(event => pubSubService.publish(event));
  machines.forEach(machine => machine.print());

  // test unsubscribe
  // pubSubService.unsubscribe('sale')
  // events.map(event => pubSubService.publish(event));
  // machines.forEach(machine => machine.print());
})();

import {
    Account,
    Address,
    AggregateTransaction,
    Deadline, InnerTransaction,
    Mosaic,
    MosaicId,
    NetworkType,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    UInt64
} from "nem2-sdk";

// 01 - Set up
const nodeUrl = 'http://localhost:3000';
const transactionHttp = new TransactionHttp(nodeUrl);

const customersAddresses: Address[] = [];
const ticketVendorAccount = Account.createFromPrivateKey('', NetworkType.MIJIN_TEST);

// 02 - Create the transfer transactions to send
let transactions: TransferTransaction[] =  customersAddresses
    .map(customer =>  TransferTransaction.create(
        Deadline.create(),
        customer,
        [new Mosaic(new MosaicId('event.2018:ticket'), UInt64.fromUint(1))],
        PlainMessage.create('Your ticket'),
        NetworkType.MIJIN_TEST));

// 03 - Create the aggregate complete transaction
const innerTransactions: InnerTransaction[] = transactions
    .map(transaction => transaction.toAggregate(ticketVendorAccount.publicAccount));

const aggregateTransaction = AggregateTransaction.createComplete(
    Deadline.create(),
    innerTransactions,
    NetworkType.MIJIN_TEST,
    []);

// 04 - Sign the transaction with vendor account
const signedTransaction = ticketVendorAccount.sign(aggregateTransaction);

// 05 - Announce the transaction
transactionHttp
    .announce(signedTransaction)
    .subscribe(x => console.log(x), err => console.error(err));
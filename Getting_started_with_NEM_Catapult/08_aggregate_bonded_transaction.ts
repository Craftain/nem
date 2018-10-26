import {
    Account,
    AggregateTransaction,
    Deadline,
    Listener,
    LockFundsTransaction,
    Mosaic,
    MosaicId,
    NetworkType,
    PlainMessage,
    PublicAccount,
    TransactionHttp,
    TransferTransaction,
    UInt64,
    XEM
} from "nem2-sdk";
import {filter, mergeMap} from "rxjs/operators";


// 01 - Set up
const nodeUrl = 'http://localhost:3000';
const transactionHttp = new TransactionHttp(nodeUrl);

// Todo: Use customer's public key
const customerPublicAccount = PublicAccount.createFromPublicKey('', NetworkType.MIJIN_TEST);
// Todo: Use vendor's private key
const ticketVendorAccount = Account.createFromPrivateKey('', NetworkType.MIJIN_TEST);

// 02 - Define the transactions
const customerToTicketVendorTx = TransferTransaction.create(
    Deadline.create(),
    ticketVendorAccount.address,
    [XEM.createRelative(190)],
    PlainMessage.create('Ticket purchase'),
    NetworkType.MIJIN_TEST);

const ticketVendorToCustomerTx = TransferTransaction.create(
    Deadline.create(),
    customerPublicAccount.address,
    [new Mosaic(new MosaicId('event.2018:ticket'), UInt64.fromUint(1))],
    PlainMessage.create('Your ticket'),
    NetworkType.MIJIN_TEST);

// 03 - Create the aggregate complete transaction
const aggregateTransaction = AggregateTransaction.createBonded(
    Deadline.create(),
    [
        customerToTicketVendorTx.toAggregate(customerPublicAccount),
        ticketVendorToCustomerTx.toAggregate(ticketVendorAccount.publicAccount)
    ],
    NetworkType.MIJIN_TEST);

// 04 - Sign the transaction with vendor account
const signedTransaction = ticketVendorAccount.sign(aggregateTransaction);


// 05 - Create a LockFundsTransaction for the signed transaction, and sign it with the vendor account.
const lockFundsTransaction = LockFundsTransaction.create(
    Deadline.create(),
    XEM.createRelative(10),
    UInt64.fromUint(480),
    signedTransaction,
    NetworkType.MIJIN_TEST);

const lockFundsTransactionSigned = ticketVendorAccount.sign(lockFundsTransaction);

const listener = new Listener(nodeUrl);

listener.open().then(() => {
    // 06 - Announce the lock funds transaction.
    transactionHttp
        .announce(lockFundsTransactionSigned)
        .subscribe(x => console.log(x), err => console.error(err));
    // 07 - Once confirmed, announce the aggregate bonded transaction with the vendor account.
    listener
        .confirmed(ticketVendorAccount.address)
        .pipe(
            filter((transaction) => transaction.transactionInfo !== undefined
                && transaction.transactionInfo.hash === lockFundsTransactionSigned.hash),
            mergeMap(ignored => transactionHttp.announceAggregateBonded(signedTransaction))
        )
        .subscribe(announcedAggregateBonded =>
            console.log(announcedAggregateBonded), err => console.error(err));
});
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
// Todo: Use ticket vendor's public key
const ticketVendorPublicAccount = PublicAccount.createFromPublicKey('', NetworkType.MIJIN_TEST);
// Todo: Use exchange's private key
const exchangeAccount = Account.createFromPrivateKey('', NetworkType.MIJIN_TEST);

const ticketPrice = 190;

// 02 - Define the transactions

// A
const customerToExchangeTx = TransferTransaction.create(
    Deadline.create(),
    exchangeAccount.address,
    [XEM.createRelative(ticketPrice * 0.10)],
    PlainMessage.create('Exchange fee for ticket purchase'),
    NetworkType.MIJIN_TEST);

// B
const customerToTicketVendorTx = TransferTransaction.create(
    Deadline.create(),
    ticketVendorPublicAccount.address,
    [XEM.createRelative(ticketPrice)],
    PlainMessage.create('Requesting one ticket'),
    NetworkType.MIJIN_TEST);

// C
const ticketVendorToCustomerTx = TransferTransaction.create(
    Deadline.create(),
    customerPublicAccount.address,
    [new Mosaic(new MosaicId('event.2018:ticket'), UInt64.fromUint(1))],
    PlainMessage.create('Here is your ticket'),
    NetworkType.MIJIN_TEST);

// D
const exchangeToTicketVendorTx = TransferTransaction.create(
    Deadline.create(),
    ticketVendorPublicAccount.address,
    [],
    PlainMessage.create('Exchange request'),
    NetworkType.MIJIN_TEST);

// 03 - Create the aggregate complete transaction
const aggregateTransaction = AggregateTransaction.createBonded(
    Deadline.create(),
    [
        customerToExchangeTx.toAggregate(customerPublicAccount),
        customerToTicketVendorTx.toAggregate(customerPublicAccount),
        ticketVendorToCustomerTx.toAggregate(ticketVendorPublicAccount),
        exchangeToTicketVendorTx.toAggregate(exchangeAccount.publicAccount)
    ],
    NetworkType.MIJIN_TEST);

// 04 - Sign the transaction with vendor account
const signedTransaction = exchangeAccount.sign(aggregateTransaction);

// 05 - Create a LockFundsTransaction for the signed transaction, and sign it with the vendor account.
const lockFundsTransaction = LockFundsTransaction.create(
    Deadline.create(),
    XEM.createRelative(10),
    UInt64.fromUint(480),
    signedTransaction,
    NetworkType.MIJIN_TEST);

const lockFundsTransactionSigned = exchangeAccount.sign(lockFundsTransaction);

// 06 - Announce the lock funds transaction.
// Once confirmed, announce the aggregate bonded transaction with the vendor account.
const listener = new Listener(nodeUrl);

listener.open().then(() => {

    transactionHttp
        .announce(lockFundsTransactionSigned)
        .subscribe(x => console.log(x), err => console.error(err));

    listener
        .confirmed(exchangeAccount.address)
        .pipe(
            filter((transaction) => transaction.transactionInfo !== undefined
            && transaction.transactionInfo.hash === lockFundsTransactionSigned.hash),
            mergeMap(ignored => transactionHttp.announceAggregateBonded(signedTransaction))
        )
        .subscribe(announcedAggregateBonded =>
            console.log(announcedAggregateBonded), err => console.error(err));
});
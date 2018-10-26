import {
    Account,
    AggregateTransaction,
    CosignatureSignedTransaction,
    CosignatureTransaction,
    InnerTransaction,
    Listener,
    MosaicId,
    NetworkType,
    PublicAccount,
    TransactionHttp,
    TransactionType,
    TransferTransaction,
    XEM
} from "nem2-sdk";

import {filter, map, mergeMap} from "rxjs/operators";

// 01 - Set up

// Todo: Use vendor's public key
const exchangePublicAccount = PublicAccount.createFromPublicKey('', NetworkType.MIJIN_TEST);
// Todo: Use vendor's private key
const ticketVendorAccount = Account.createFromPrivateKey('', NetworkType.MIJIN_TEST);

const nodeUrl = 'http://localhost:3000';
const transactionHttp = new TransactionHttp(nodeUrl);
const listener = new Listener(nodeUrl);

// 02 - Specify ticket price and mosaic
const ticketPrice = XEM.createRelative(190);
// Todo: For this exercise, we'll fetch this using nem2-cli
const ticketId = new MosaicId([ 3559849083, 313884163 ]); 

const cosignAggregateBondedTransaction = (transaction: AggregateTransaction, account: Account): CosignatureSignedTransaction => {
    const cosignatureTransaction = CosignatureTransaction.create(transaction);
    return account.signCosignatureTransaction(cosignatureTransaction);
};

// 03 - Specify the off-chain logic checks
const isAggregateTransactionValid = (innerTransactions: InnerTransaction[]) => {
    
    let transferInnerTransactions = <TransferTransaction[]> innerTransactions
        .filter( _ => _.type === TransactionType.TRANSFER);
    
    const customerToExchangeTx = transferInnerTransactions
        .filter(_ =>  _.recipient.equals(exchangePublicAccount.address))[0];
    
    const customerToTicketVendorTx = transferInnerTransactions
        .filter(_ => (_.recipient.equals(ticketVendorAccount.address)) && _.mosaics.length > 0)[0];

    const exchangeToTicketVendorTx =  transferInnerTransactions
        .filter(_ => _.recipient.equals(ticketVendorAccount.address) &&  _.mosaics.length === 0)[0];

    const ticketVendorToCustomer =  transferInnerTransactions
        .filter(_ => _ !== customerToExchangeTx && _
            !== customerToTicketVendorTx &&
            _ !== exchangeToTicketVendorTx)[0];

    const validTransactionsLength = ((innerTransactions
        .filter(_ => _.type === TransactionType.TRANSFER).length === 4) && (innerTransactions.length == 4));

    console.log('validTxLength: ' + validTransactionsLength);

    const validMosaicsLength = (customerToExchangeTx.mosaics.length == 1 &&
        customerToTicketVendorTx.mosaics.length === 1
        && ticketVendorToCustomer.mosaics.length === 1
        && exchangeToTicketVendorTx.mosaics.length === 0);

    console.log('validMosaicsLength: ' + validMosaicsLength);

    const validMosaics = (customerToExchangeTx.mosaics[0].id.toHex() === XEM.MOSAIC_ID.toHex() &&
        customerToTicketVendorTx.mosaics[0].id.toHex() === XEM.MOSAIC_ID.toHex()
        && ticketVendorToCustomer.mosaics[0].id.toHex() === ticketId.toHex());

    console.log('validMosaics: ' + validMosaics);

    const validExchangeRate = (customerToExchangeTx.mosaics[0].amount.compact()  ==
        customerToTicketVendorTx.mosaics[0].amount.compact() * 0.10);

    console.log('validExchangeRate: ' + validExchangeRate);

    const validNumberOfTickets = (customerToTicketVendorTx.mosaics[0].amount.compact() / ticketPrice.amount.compact() ==
        ticketVendorToCustomer.mosaics[0].amount.compact());

    console.log('validNumberOfTickets: ' + validNumberOfTickets);

    return (validTransactionsLength &&
        validMosaicsLength &&
        validMosaics &&
        validExchangeRate &&
        validNumberOfTickets);
}

// 04 - Handle signing and announcement of cosigning

listener.open().then(() => {

    listener
        .aggregateBondedAdded(ticketVendorAccount.address)
        .pipe(
            filter((_) => !_.signedByAccount(ticketVendorAccount.publicAccount)),
            filter((_) => (isAggregateTransactionValid(_.innerTransactions))),
            map(transaction => cosignAggregateBondedTransaction(transaction, ticketVendorAccount)),
            mergeMap(cosignatureSignedTransaction => transactionHttp.announceAggregateBondedCosignature(cosignatureSignedTransaction))
        )
        .subscribe(announcedTransaction => console.log(announcedTransaction), err => console.error(err));
});

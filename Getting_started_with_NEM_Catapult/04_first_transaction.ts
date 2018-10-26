import {Account, Address, Deadline, NetworkType, PlainMessage, TransactionHttp, TransferTransaction,} from 'nem2-sdk';

// 01 - Set up
const nodeUrl ='http://localhost:3000';
const transactionHttp = new TransactionHttp(nodeUrl);

// Todo: Use vendor's address
const customerAddress = Address.createFromRawAddress('');
// Todo: Use vendor's private key
const ticketVendorAccount = Account.createFromPrivateKey('', NetworkType.MIJIN_TEST);

// 02 - Create the transfer transaction
const transferTransaction = TransferTransaction.create(
    Deadline.create(),
    customerAddress,
    [],
    PlainMessage.create('Your ticket'),
    NetworkType.MIJIN_TEST);

// 03 - Sign the transaction with vendor account
const signedTransaction = ticketVendorAccount.sign(transferTransaction);

// 04 - Announce the transaction
transactionHttp
    .announce(signedTransaction)
    .subscribe(x => console.log(x), err => console.error(err));
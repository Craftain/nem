import {
    Account,
    Deadline,
    ModifyMultisigAccountTransaction,
    MultisigCosignatoryModification,
    MultisigCosignatoryModificationType,
    NetworkType,
    PublicAccount,
    TransactionHttp
} from "nem2-sdk";

// 01 - Set up
const nodeUrl = 'http://localhost:3000';
const transactionHttp = new TransactionHttp(nodeUrl);

const customerAccount = Account.createFromPrivateKey('', NetworkType.MIJIN_TEST);
const phonePublicAccount = PublicAccount.createFromPublicKey('', NetworkType.MIJIN_TEST);
const backupPublicAccount = PublicAccount.createFromPublicKey('', NetworkType.MIJIN_TEST);
const computerPublicAccount = PublicAccount.createFromPublicKey('', NetworkType.MIJIN_TEST);

// 02 - Define Modify Multisig Account Transaction

const createMultisigTransaction = ModifyMultisigAccountTransaction.create(
    Deadline.create(),
    2,
    1,
    [
        new MultisigCosignatoryModification(
            MultisigCosignatoryModificationType.Add,
            phonePublicAccount,
        ),
        new MultisigCosignatoryModification(
            MultisigCosignatoryModificationType.Add,
            computerPublicAccount,
        ),
        new MultisigCosignatoryModification(
            MultisigCosignatoryModificationType.Add,
            backupPublicAccount,
        )],
    NetworkType.MIJIN_TEST);


// 03 -  Sign the transaction
const signedTransaction = customerAccount.sign(createMultisigTransaction);

// 04 - Announce the transaction
transactionHttp
    .announce(signedTransaction)
    .subscribe(x => console.log(x), err => console.error(err));
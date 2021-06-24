import { format, subDays } from "date-fns";
import {
  ITransactionImporter,
  ITransactionParser,
  OfxTransactionParser,
  YnabTransactionImporter,
} from "ynab-sync-core";
import { WestpacTransactionExporter } from "ynab-sync-westpac-au";
import commander from "commander";

export type WestpacTransactionExportParams = {
  westpacUsername: string;
  westpacPassword: string;
  westpacAccountName: string;
  numberOfDaysToSync: number;
  debug: boolean;
  ynabApiKey: string;
  ynabBudgetId: string;
  ynabAccountId: string;
};

export const exportTransactions = async (
  params: WestpacTransactionExportParams
) => {
  let startDate = subDays(new Date(), params.numberOfDaysToSync);

  const exporter = new WestpacTransactionExporter();

  console.log(
    `Exporting westpac transactions with start date of '${format(
      startDate,
      "P"
    )}'`
  );

  const output = await exporter.export({
    username: params.westpacUsername,
    password: params.westpacPassword,
    accountName: params.westpacAccountName,
    startDate: startDate,
    debug: params.debug,
  });

  console.log(`Transactions exported successfully to '${output.filePath}'`);

  console.log(`Parsing transactions from '${output.filePath}'`);

  const parser: ITransactionParser = new OfxTransactionParser({
    debug: params.debug,
  });

  const transactions = parser.parse(params.ynabAccountId, output.filePath);

  console.log(
    `Parsed '${transactions.length}' transactions from '${output.filePath}'`
  );

  const importer: ITransactionImporter = new YnabTransactionImporter({
    credentials: {
      apiKey: params.ynabApiKey,
    },
    debug: params.debug,
  });

  console.log(`Importing '${transactions.length}' transactions into YNAB`);

  await importer.import(params.ynabBudgetId, transactions);

  console.log(
    `Imported '${transactions.length}' transactions into YNAB successfully`
  );
};

export const createWestpacCommand = (): commander.Command => {
  return new commander.Command("westpac")
    .description("Sync Westpac transactions")
    .requiredOption("-u, --westpac-username <username>", "Westpac username")
    .requiredOption("-p, --westpac-password <password>", "Westpac password")
    .requiredOption(
      "--westpac-account-name  <account-name>",
      "Name of Westpac account to sync from"
    )
    .option<number>(
      "--number-of-days-to-sync <number-of-days-to-sync>",
      "Numbers of days of transactions to sync",
      (value: string) => parseInt(value),
      7
    )
    .requiredOption("--ynab-api-key <ynab-api-key>", "YNAB Api key")
    .requiredOption(
      "--ynab-budget-id <ynab-budget-id>",
      "Id of YNAB budget to import into"
    )
    .requiredOption(
      "--ynab-account-id <ynab-account-id>",
      "Id of YNAB account to import into"
    )
    .option("-d|--debug", "Whether to run in debug mode", false)
    .action(async (args: WestpacTransactionExportParams) => {
      await exportTransactions(args);
    });
};

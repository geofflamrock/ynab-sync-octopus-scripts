import { format, isValid, parseISO, subDays } from "date-fns";
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
  startDate?: Date;
  endDate?: Date;
  debug: boolean;
  ynabApiKey: string;
  ynabBudgetId: string;
  ynabAccountId: string;
};

export const exportTransactions = async (
  params: WestpacTransactionExportParams
) => {
  let endDate = undefined;

  if (params.endDate !== undefined) {
    endDate = params.endDate;
  }

  let startDate = subDays(endDate ?? new Date(), params.numberOfDaysToSync);

  if (params.startDate !== undefined) {
    startDate = params.startDate;
  }

  const exporter = new WestpacTransactionExporter();

  console.log(
    `Exporting westpac transactions with date range of '${format(
      startDate,
      "P"
    )}' to '${format(endDate ?? new Date(), "P")}'`
  );

  const output = await exporter.export({
    username: params.westpacUsername,
    password: params.westpacPassword,
    accountName: params.westpacAccountName,
    startDate: startDate,
    endDate: endDate,
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

export const createWestpacAuSyncCommand = (): commander.Command => {
  return new commander.Command("westpac-au")
    .description("Sync Westpac Australia transactions to YNAB")
    .requiredOption("--westpac-username <username>", "Westpac username")
    .requiredOption("--westpac-password <password>", "Westpac password")
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
    .option<Date>(
      "--start-date <start-date>",
      "Start date to sync from in ISO format (yyyy-MM-dd). If this is set then --number-of-days-to-sync is ignored.",
      (value: string) => {
        const date = parseISO(value);
        if (!isValid(date))
          throw new commander.InvalidOptionArgumentError(
            "Date must be be in format 'yyyy-MM-dd'"
          );
        return date;
      },
      undefined
    )
    .option<Date>(
      "--end-date <end-date>",
      "End date to sync to in ISO format (yyyy-MM-dd). If this is set then --number-of-days-to-sync is taken from this date.",
      (value: string) => {
        const date = parseISO(value);
        if (!isValid(date))
          throw new commander.InvalidOptionArgumentError(
            "Date must be be in format 'yyyy-MM-dd'"
          );
        return date;
      },
      undefined
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
    .option("--debug", "Whether to run in debug mode", false)
    .action(async (args: WestpacTransactionExportParams) => {
      await exportTransactions(args);
    });
};

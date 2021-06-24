import { format, subDays } from "date-fns";
import {
  ITransactionImporter,
  ITransactionParser,
  OfxTransactionParser,
  YnabTransactionImporter,
} from "ynab-sync-core";
import {
  WestpacTransactionExporter,
  WestpacTransactionExportInputs,
} from "ynab-sync-westpac-au";

const exportTransactions = async () => {
  const numberOfDaysToSync = parseInt(
    process.env["Sync.Westpac.NumberOfDays"] ||
      "#{Sync.Westpac.NumberOfDays}" ||
      "7"
  );

  let startDate = subDays(new Date(), numberOfDaysToSync);

  let debug = false;

  if (
    (process.env["Sync.Westpac.Debug"] || "#{Sync.Westpac.Debug}" || "") ===
    "true"
  ) {
    console.log("Running in debug mode");
    debug = true;
  }

  const inputs: WestpacTransactionExportInputs = {
    username:
      process.env["Sync.Westpac.Username"] || "#{Sync.Westpac.Username}" || "",
    password:
      process.env["Sync.Westpac.Password"] || "#{Sync.Westpac.Password}" || "",
    accountName:
      process.env["Sync.Westpac.AccountName"] ||
      "#{Sync.Westpac.AccountName}" ||
      "",
    startDate: startDate,
    debug: debug,
  };
  const exporter = new WestpacTransactionExporter();

  console.log(
    `Exporting westpac transactions with start date of '${format(
      startDate,
      "P"
    )}'`
  );

  const output = await exporter.export(inputs);

  console.log(`Transactions exported successfully to '${output.filePath}'`);

  console.log(`Parsing transactions from '${output.filePath}'`);

  const parser: ITransactionParser = new OfxTransactionParser({
    debug: debug,
  });

  const transactions = parser.parse(
    process.env["Sync.Westpac.YnabAccountId"] ||
      "#{Sync.Westpac.YnabAccountId}" ||
      "",
    output.filePath
  );

  console.log(
    `Parsed '${transactions.length}' transactions from '${output.filePath}'`
  );

  const importer: ITransactionImporter = new YnabTransactionImporter({
    credentials: {
      apiKey:
        process.env["Sync.Westpac.YnabApiKey"] ||
        "#{Sync.Westpac.YnabApiKey}" ||
        "",
    },
    debug: debug,
  });

  console.log(`Importing '${transactions.length}' transactions into YNAB`);

  await importer.import(
    process.env["Sync.Westpac.YnabBudgetId"] ||
      "#{Sync.Westpac.YnabBudgetId}" ||
      "",
    transactions
  );

  console.log(
    `Imported '${transactions.length}' transactions into YNAB successfully`
  );
};

exportTransactions()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

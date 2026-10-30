/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as explanations from "../explanations.js";
import type * as helpers from "../helpers.js";
import type * as milestones from "../milestones.js";
import type * as products from "../products.js";
import type * as reminders from "../reminders.js";
import type * as scans from "../scans.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as verdictCompute from "../verdictCompute.js";
import type * as verdicts from "../verdicts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  crons: typeof crons;
  demo: typeof demo;
  explanations: typeof explanations;
  helpers: typeof helpers;
  milestones: typeof milestones;
  products: typeof products;
  reminders: typeof reminders;
  scans: typeof scans;
  seed: typeof seed;
  users: typeof users;
  validators: typeof validators;
  verdictCompute: typeof verdictCompute;
  verdicts: typeof verdicts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

# Connectors and adapters

Yallapp reads an app's content in one of two ways:

- **Connectors** (the platform's hosted API, `platform/web/src/lib/hosted/connectors`)
  read a platform the client connected (Shopify, ikas, Teachable...) or the content
  the client keeps on Yallapp (apps without a website).
- **Adapters** (the WordPress plugin, `wp-plugin/yallapp/includes`) read the
  course, booking or shop plugin a WordPress site runs.

Both turn what they read into the shapes of `docs/api/openapi.yaml`, so the app
doesn't know which one it talks to.

## Versions

Each connector and adapter has its own version, `major.minor.patch`:

- **patch** (1.0.1) for a fix: the same data, read correctly;
- **minor** (1.1.0) for something new it sends the app (more fields, a new list);
- **major** (2.0.0) when the app must change too.

Raise the version in the same change as the code. Versions started at 1.0.0 with
roadmap 83.4.

- A connector's version is in `CONNECTOR_VERSIONS`
  (`lib/hosted/connectors/versions.ts`); Admin › the client shows it in the
  app's "Connector" row.
- An adapter's version is its class's `ADAPTER_VERSION` constant. The plugin
  sends the versions of the adapters a site uses with each license check
  (`SiteInfo.adapters`), and Admin › the client shows them in the
  "Website runs" row.

The tables below must match the code: `connector-versions.test.ts` and the
plugin's `AdapterVersionsTest.php` check them.

## Connectors

| Connector | Name | Version | Reads |
|---|---|---|---|
| `catalog` | Products (no website) | 1.0.0 | Yallapp |
| `bookings` | Services and appointments (no website) | 1.0.0 | Yallapp |
| `courses` | Courses (no website) | 1.0.0 | Yallapp |
| `listings` | Listings (real estate) | 1.0.0 | Yallapp |
| `articles` | Articles (news and blog) | 1.0.0 | Yallapp |
| `events` | Events and tickets | 1.0.0 | Yallapp |
| `campaigns` | Campaigns and donations | 1.0.0 | Yallapp |
| `deliveries` | Shipments and couriers | 1.0.0 | Yallapp |
| `restaurants` | Restaurants and food orders | 1.0.0 | Yallapp |
| `rides` | Rides and drivers | 1.0.0 | Yallapp |
| `school` | School: classes, people, homework, grades and fees | 1.0.0 | Yallapp |
| `shopify` | Shopify | 1.0.0 | Storefront API and Admin API (GraphQL) |
| `ikas` | ikas | 1.0.0 | ikas Admin API (GraphQL, v1) |
| `ticimax` | Ticimax | 1.0.0 | Ticimax web services (SOAP) |
| `ideasoft` | IdeaSoft | 1.0.0 | IdeaSoft Admin API (REST, OAuth 2) |
| `wix` | Wix | 1.0.0 | Wix REST APIs (Stores, Bookings) |
| `salla` | Salla | 1.0.0 | Salla Admin API v2 (OAuth 2) |
| `zid` | Zid | 1.0.0 | Zid API v1 (OAuth 2) |
| `teachable` | Teachable | 1.1.0 | Teachable API v1 |
| `thinkific` | Thinkific | 1.1.0 | Thinkific Public API v1 |
| `simplybook` | SimplyBook.me | 1.0.0 | SimplyBook.me API v2 (REST) |
| `rss` | RSS feed | 1.0.0 | RSS 2.0 and Atom feeds |

## Adapters

| Adapter | Reads | Version | Class |
|---|---|---|---|
| `tutor` | Tutor LMS | 1.0.0 | `Lms\Tutor_Adapter` |
| `learndash` | LearnDash | 1.0.0 | `Lms\LearnDash_Adapter` |
| `learnpress` | LearnPress | 1.0.0 | `Lms\LearnPress_Adapter` |
| `lifterlms` | LifterLMS | 1.0.0 | `Lms\LifterLMS_Adapter` |
| `masterstudy` | MasterStudy LMS | 1.0.0 | `Lms\MasterStudy_Adapter` |
| `sensei` | Sensei LMS | 1.0.0 | `Lms\Sensei_Adapter` |
| `masteriyo` | Masteriyo | 1.0.0 | `Lms\Masteriyo_Adapter` |
| `amelia` | Amelia | 1.0.0 | `Bookings\Amelia_Adapter` |
| `bookingpress` | BookingPress | 1.0.0 | `Bookings\BookingPress_Adapter` |
| `latepoint` | LatePoint | 1.0.0 | `Bookings\LatePoint_Adapter` |
| `woocommerce` | WooCommerce | 1.0.0 | `Store\Catalog` |

## Adding a connector

A platform the client connects with keys or with OAuth (the Website step):

1. Write `lib/hosted/connectors/<platform>.ts`: a class implementing
   `PlatformConnector` (`Connector` from `types.ts` plus `check()`), mapping the
   platform's data to the contract's shapes. Read only; never write to the
   client's platform.
2. Describe it with a `PlatformDefinition` (its fields, which are secret,
   `normalize`, `create`, and `oauth` for a partner app) and call
   `registerPlatform`. Add its ID to `PlatformId` and import the file in
   `registry.ts`.
3. Add it to `CONNECTOR_VERSIONS` at 1.0.0, with the API it reads, and to the
   table above.
4. Test it against a fake platform (`fetcher`), never the real one: what it
   maps, what it leaves out, and the errors the client can fix
   (`PlatformCheckError`). The app's contract tests (`expectContract`) check
   its answers.
5. Add it to the Website step's list for its app type and to
   `docs/ARCHITECTURE.md`; the client-facing name goes in all three
   dashboard languages.

Content kept on Yallapp (a new kind of app without a website) is a connector
too: a new `ConnectorConfig` kind, its tables and dashboard pages, and the same
steps 3 and 4.

## Adding an adapter

A course, booking or shop plugin a WordPress site runs:

1. Write the class in `wp-plugin/yallapp/includes/lms` (extending
   `Lms\Base_Adapter`) or `includes/bookings` (extending
   `Bookings\Base_Adapter`). It inherits `ADAPTER_VERSION`; set its own when it
   changes.
2. Teach `Detector` to find the plugin, and add the class to
   `Plugin::LMS_ADAPTERS` or `Plugin::BOOKING_ADAPTERS`. Another plugin can
   also add one with the `yallapp_lms_adapter` or `yallapp_booking_adapter`
   filter; it is listed with the license check only if it has an
   `ADAPTER_VERSION`.
3. Add it to the table above, and an end-to-end job in
   `.github/workflows/ci.yml` (the "Plugin end-to-end" jobs) that installs the plugin it reads on a real
   WordPress and runs the app API against it.
4. Keep PHP 7.4 and WordPress 6.0: the plugin's checks (`composer lint`,
   `php -l`) run in CI.

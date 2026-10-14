# Build pipeline

Builds, signs and delivers each client's apps. Runs on GitHub Actions
([`.github/workflows/build-apps.yml`](../.github/workflows/build-apps.yml)) and
talks to the platform through [`docs/api/pipeline.yaml`](../docs/api/pipeline.yaml).

## How a build runs

1. The client finishes the setup wizard or clicks "Start new build". The
   platform saves a snapshot of the build config and queues the build.
2. The platform starts the workflow at once (with `GITHUB_DISPATCH_TOKEN`), and
   its schedule checks again every hour. Each run takes up to 5 queued
   builds and marks them `building`, with a link to the run.
3. **Android** (Ubuntu), per build:
   - Applies the build config to `mobile/` (`tool/apply_config.dart`) and
     writes the client's launcher icons (`scripts/make_icons.py`).
   - Creates the app's upload key on its first build and saves it on the
     platform before building. Every later build reuses that key, and the
     platform never replaces a saved key.
   - Builds the APK and App Bundle and uploads them, plus the upload key
     (zip) and the store assets (zip: store icons, a feature graphic, the
     client's screenshots and the listing texts), to `files.yallapp.com.tr`.
   - **Pro:** uploads the App Bundle to the Google Play internal track.
4. **iOS** (macOS), per build, only when the client added an App Store Connect
   key:
   - Registers the App ID (with push when the app has Firebase).
   - Creates an Apple Distribution certificate once and saves it on the
     platform.
   - Gets an App Store profile, signs and exports the IPA, and uploads it.
   - **Pro:** uploads to TestFlight.
5. A last job sends the final status, the files and a message for the
   client, in plain words. The build is `ready` when the Android app was
   built, also when the iOS app couldn't be (its stage then shows as failed
   and the message says so), and `failed` when the Android app couldn't be
   built. The platform emails the client, and the team when something
   failed (with the run's log, which clients never see).
6. A run that's cancelled or crashes before reporting leaves the build
   `building`: after 6 hours without a report the platform treats it as
   stopped, closes it when the client starts a new build, and the team can
   close it from the admin's build queue.

Download links are signed by the platform when it shows them and expire after
15 minutes. `files-host/index.php` checks the signature on `files.yallapp.com.tr`.

## One-time setup

### 1. `files.yallapp.com.tr` on cPanel (host.webek.org)

1. **Domains:** create the subdomain `files.yallapp.com.tr` with its own
   document root, for example `/home/USER/files.yallapp.com.tr`.
2. Create a storage folder **outside** `public_html` and the document root,
   for example `/home/USER/yallapp-files`.
3. **FTP:** enable Pure-FTPd (WHM › FTP Server Selection) with TLS required. Create
   the account with UAPI so its home is the storage folder, not a folder in public_html:
   `uapi --user=CPANEL_USER Ftp add_ftp user=pipeline domain=yallapp.com.tr pass=... homedir=yallapp-files quota=0`
4. Upload `files-host/index.php` and `files-host/.htaccess` to the document
   root.
5. Copy `config.sample.php` to `config.php` there. Fill in:
   - `signing_secret`: the same value as `FILES_SIGNING_SECRET` in Netlify.
     Generate it with `openssl rand -hex 32`.
   - `storage_dir`: the storage folder.
6. **SSL/TLS Status:** run AutoSSL for the subdomain.

### 2. GitHub repository settings

In **Settings › Secrets and variables › Actions**, add these.

**Variables:**

| Name | Value |
|---|---|
| `PLATFORM_API_URL` | `https://yallapp.com.tr/api/v1` |
| `FILES_BASE_URL` | `https://files.yallapp.com.tr` |

**Secrets:**

| Name | Value |
|---|---|
| `BUILD_PIPELINE_TOKEN` | The same value as in Netlify |
| `FILES_FTP_URL` | `ftp://host.webek.org/` (port 21; the upload requires TLS, so nothing travels unencrypted) |
| `FILES_FTP_USER` | The FTP account from step 1 |
| `FILES_FTP_PASSWORD` | Its password |

Until `PLATFORM_API_URL` is set, the scheduled run does nothing. Scheduled
workflows only run on the default branch, so the pipeline starts once this
work is merged.

### 3. Netlify

Set these alongside the platform's other variables (`platform/web/README.md`):

- `FILES_BASE_URL`
- `FILES_SIGNING_SECRET`
- `BUILD_PIPELINE_TOKEN`
- `GITHUB_DISPATCH_TOKEN` (optional): starts builds at once instead of on the
  next 10-minute schedule. Create it in GitHub › Settings › Developer settings ›
  Fine-grained tokens: repository `WEBEK-LTD/app-lms` only, permission
  **Actions: Read and write**, nothing else.

## What clients do once

Clients who chose "Publish it for me" (dashboard › Publishing) do none of
this themselves: they invite our publishing team email to their accounts,
and the team publishes from the admin's Publishing page.

- **Google Play (Pro):** create the app in Play Console and upload the first
  App Bundle by hand. Google Play doesn't let any tool create an app or make
  its first upload. After that, every build is uploaded automatically.
- **App Store:** create the app in App Store Connect with the bundle ID from
  the setup wizard. Apple doesn't let any tool create apps. Then add an App
  Store Connect API key (App Manager role) in the dashboard. On Starter the key
  is only used to sign the IPA, which the client uploads with Transporter.

## Files

| Path | What it does |
|---|---|
| `scripts/platform.py` | Calls the pipeline API |
| `scripts/android.sh`, `scripts/ios.sh` | Build, sign and upload one app |
| `scripts/upload.sh` | Uploads files over FTPS and prints their artifact list |
| `scripts/report.py` | Sends the final status |
| `scripts/make_icons.py` | Writes launcher icons from the client's 1024 px icon |
| `scripts/store_assets.py` | Packs the store assets zip: icons, feature graphic, screenshots, listing |
| `fastlane/Fastfile` | iOS signing, Google Play and TestFlight uploads (fastlane 2.240.1, `Gemfile.lock`) |
| `files-host/` | The download gate on `files.yallapp.com.tr` |
| `tests/` | Unit tests: `python3 -m unittest discover build/tests` |

Secrets never reach the logs. Passwords are masked, and keys from the
platform are only written to a private temporary folder that is deleted when
the job ends.

## Own runner on our server

The Linux jobs (CI and Android builds) can run on our own server instead of
GitHub's paid minutes; iOS still needs GitHub's macOS runners.
`runner/install.sh` sets runners up on an AlmaLinux 9 x86_64 server, with or
without cPanel and CloudLinux:

- Each runner is a Podman container, close to GitHub's `ubuntu-24.04`
  runners, run by a system service (`yallapp-runner-N`), outside cPanel's
  accounts. Jobs run as an ordinary user inside their container, with sudo
  there only. The containers run under root's Podman rather than rootless:
  CloudLinux turns user namespaces off for everyone, and turning them on
  would widen what every hosting account can reach.
- Each runner runs one job at a time and is capped (default 2 CPU cores and
  4 GB of memory) so the sites on the server keep their share.

The script is one file, so it can be pasted on the server. As root (SSH, or
WHM > Server Configuration > Terminal), save it as `/root/yallapp-runner.sh`
and run:

```sh
RUNNERS=2 CPUS=2 MEMORY=4g bash /root/yallapp-runner.sh
```

It asks for a registration token from the repository's Settings > Actions >
Runners > New self-hosted runner (it lasts an hour and is only needed while
runners register). Then set the repository variable `LINUX_RUNNER` to
`yallapp` (Settings > Secrets and variables > Actions > Variables): every
Linux job moves to our runners. Delete the variable to go back to GitHub's
runners.

Running the script again rebuilds the image and restarts the runners (press
Enter at the token question to keep the saved one). Status and logs:
`systemctl status yallapp-runner-1`, `journalctl -u yallapp-runner-1 -f`.

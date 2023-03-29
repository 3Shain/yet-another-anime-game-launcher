const execa = require('execa')
const fs = require('fs-extra')
const path = require('path')
const { rimraf } = require('rimraf')
const { IconIcns } = require('@shockpkg/icon-encoder');

(async () => {
  const icns = new IconIcns()
  const raw = true

  await execa('pnpm', ['exec', 'tsc']) // do typecheck first
  await execa('pnpm', ['exec', 'vite', 'build'])
  await execa('pnpm', ['exec', 'neu', 'update'])
  await execa('cp', ['-R', 'neutralinojs/.', 'bin/.'])
  // run neu build command
  await execa('pnpm', ['exec', 'neu', 'build'])

  // build done read neutralino.config.js file
  const config = await fs.readJSON(
    path.resolve(process.cwd(), 'neutralino.config.json')
  )
  const isOverseaVersion = process.env.YAAGL_OVERSEA === '1'
  const bundleId = isOverseaVersion
    ? config.applicationId + '.os'
    : config.applicationId
  const appname = config.cli.binaryName
  const appDistributionName = isOverseaVersion
    ? config.cli.binaryName + ' OS'
    : config.cli.binaryName
  const binaryName = `${config.cli.binaryName}-mac_x64`

  // read package.json
  const pkg = await fs.readJSON(path.resolve(process.cwd(), 'package.json'))
  // remove old app folder
  await rimraf(path.resolve(process.cwd(), `${appDistributionName}.app`))
  // create app folder
  await fs.mkdir(path.resolve(process.cwd(), `${appDistributionName}.app`))
  await fs.mkdir(
    path.resolve(process.cwd(), `${appDistributionName}.app`, 'Contents')
  )
  await fs.mkdir(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'MacOS'
    )
  )
  await fs.mkdir(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'Resources'
    )
  )
  await fs.mkdir(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'Resources',
      '.storage'
    )
  )
  // move binary to app folder
  await fs.move(
    path.resolve(process.cwd(), 'dist', appname, binaryName),
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'MacOS',
      binaryName
    )
  )
  await fs.rename(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'MacOS',
      binaryName
    ),
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'MacOS',
      appname
    )
  )

  // move res.neu or resources.neu to app folder
  const resources = fs.readdirSync(
    path.resolve(process.cwd(), 'dist', appname)
  )
  const resourcesFile = resources.find((file) => /res(ources)?/.test(file))
  await fs.copy(
    path.resolve(process.cwd(), 'dist', appname, resourcesFile),
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'Resources',
      resourcesFile
    )
  )

  // check if file exists
  if (fs.existsSync(path.join(process.cwd(), config.modes.window.icon))) {
    const iconFile = await fs.readFile(
      path.join(process.cwd(), config.modes.window.icon)
    )
    icns.addFromPng(iconFile, ['ic09'], raw)
    // icns.addFromPng(iconFile, ['ic07'], raw);
    // icns.addFromPng(iconFile, ['ic08'], raw);
    // icns.addFromPng(iconFile, ['ic04'], raw);
    // icns.addFromPng(iconFile, ['ic09'], raw);
    // icns.addFromPng(iconFile, ['ic05'], raw);
    // icns.addFromPng(iconFile, ['ic12'], raw);
    // icns.addFromPng(iconFile, ['ic13'], raw);
    // icns.addFromPng(iconFile, ['ic14'], raw);
    // icns.addFromPng(iconFile, ['ic10'], raw);
    // icns.addFromPng(iconFile, ['ic11'], raw);
  }
  // save icns file
  await fs.writeFile(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'Resources',
      'icon.icns'
    ),
    icns.encode()
  )

  // create an empty icon file in the app folder
  await fs.ensureFile(
    path.resolve(process.cwd(), `${appDistributionName}.app`, 'Icon')
  )

  //
  await fs.writeFile(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'MacOS',
      'parameterized'
    ),
    `#!/usr/bin/env bash
SCRIPT_DIR="$( cd -- "$( dirname -- "\${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
APST_DIR="$HOME/Library/Application Support/${appDistributionName}"
echo $APST_DIR
mkdir -p "$APST_DIR"
CONTENTS_DIR="$(dirname "$SCRIPT_DIR")"
rsync -rlptu "$CONTENTS_DIR/Resources/." "$APST_DIR"
cd "$APST_DIR"
PATH_LAUNCH="$(dirname "$CONTENTS_DIR")"${
      isOverseaVersion ? ' YAAGL_OVERSEA=1' : ''
    } exec "$SCRIPT_DIR/${appname}" --path="$APST_DIR"`
  )

  await fs.chmod(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'MacOS',
      'parameterized'
    ),
    0o755
  )
  await fs.chmod(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'MacOS',
      appname
    ),
    0o755
  )
  // copy sidecar
  const sidecarDst = path.resolve(
    process.cwd(),
    `${appDistributionName}.app`,
    'Contents',
    'Resources',
    'sidecar'
  )
  await fs.copy(path.resolve(process.cwd(), 'sidecar'), sidecarDst, {
    preserveTimestamps: true
  });

  (async function getFiles (dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true })
    await Promise.all(
      dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name)
        return dirent.isDirectory()
          ? getFiles(res)
          : dirent.isFile()
            ? dirent.name.split('.').length === 1
              ? fs.chmod(res, 0o755).then(() => {
                console.log('chmod +x ' + res)
              })
              : Promise.resolve()
            : Promise.resolve()
      })
    )
  })(sidecarDst)

  // chmod executable
  // create info.plist file
  await fs.writeFile(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      'Contents',
      'info.plist'
    ),
    `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>NSHighResolutionCapable</key>
        <true/>
        <key>CFBundleExecutable</key>
        <string>parameterized</string>
        <key>CFBundleIconFile</key>
        <string>icon.icns</string>
        <key>CFBundleIdentifier</key>
        <string>${bundleId}</string>
        <key>CFBundleName</key>
        <string>${config.modes.window.title}</string>
        <key>CFBundleDisplayName</key>
        <string>${config.modes.window.title}</string>
        <key>CFBundlePackageType</key>
        <string>APPL</string>
        <key>CFBundleVersion</key>
        <string>${config.version}</string>
        <key>CFBundleShortVersionString</key>
        <string>${config.version}</string>
        <key>NSHumanReadableCopyright</key>
        <string>Copyright © 2023 3Shain.</string>
        <key>LSMinimumSystemVersion</key>
        <string>10.13.0</string>
        <key>NSAppTransportSecurity</key>
        <dict>
            <key>NSAllowsArbitraryLoads</key>
            <true/>
        </dict>
    </dict>
    </plist>`
  )
})()

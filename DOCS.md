# Dev Docs

this is a [Electron](https://www.electronjs.org/) project bootstrapped with [Electron React Boilerplate.
](https://github.com/electron-react-boilerplate/electron-react-boilerplate)

in a nutshell its a GUI that interacts with [warp-plus](https://github.com/bepass-org/warp-plus/) binary and changes system proxy setting.

<!-- uses [tun2socks](https://github.com/xjasonlyu/tun2socks) to tunnel all OS traffic through the socks5 proxy that warp-plus creates. and makes sure it's run on three main Desktop Operating Systems. -->

## Getting Started

1. clone this repo

2. install packages and run

```shell
npm install
npm run dev # or npm start
```

## Packaging for Production

To package for the local platform:

```shell
npm run package
```

## IPC (sending data between main and renderer)

as you may be familiar with electron already.  
we need to use [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc) in order to send and receive data between main and renderer.  
checkout `src/main/ipc.ts` and `src/renderer/index.tsx` for an in action example.

## User Settings

user settings is being handled by [electron-settings](https://github.com/nathanbuchar/electron-settings) but i did'nt enabled `enableRemoteModule` for security reasons. ([read more](https://medium.com/@nornagon/electrons-remote-module-considered-harmful-70d69500f31)).

so for `main` just use `electron-settings` directly. and for `renderer` use settings.ts module(`src/renderer/lib/settings.ts`)(asynchronously!)

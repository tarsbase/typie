
import * as Electron from "electron";
import * as path from "path";
import { format as formatUrl } from "url";

import {app} from "electron";
import * as is from "electron-is";
const isDevelopment = process.env.NODE_ENV !== "production";

class AbstractWindowController {
    public isExist: boolean = false;
    public isVisible: boolean = false;
    protected win = {} as Electron.BrowserWindow;
    private position: any;

    constructor() {
        this.isExist = false;
        this.win = {} as Electron.BrowserWindow;
    }

    public absCreateWindow(options: Electron.BrowserWindowConstructorOptions): void {
        console.log("Create Window");
        this.win = new Electron.BrowserWindow(options);

        if (isDevelopment) {
            this.win.webContents.openDevTools();
        }

        if (isDevelopment) {
            this.win.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
        } else {
            this.win.loadURL(formatUrl({
                pathname: path.join(__dirname, "index.html"),
                protocol: "file",
                slashes: true,
            }));
        }

        this.isExist = true;
        this.isVisible = false;
    }

    public send(channel: string, ...args: any[]): void {
        if (this.isExist) {
            this.win.webContents.send(channel, ...args);
        }
    }

    public on(event: any, callback: (res) => void): void {
        this.win.on(event, callback);
    }

    public onWebContent(event: any, callback: (res) => void): void {
        this.win.webContents.on(event, callback);
    }

    public init(): void {
        this.position = this.win.getPosition();
        this.isVisible = true;
        // this.hide();
        this.win.show();
    }

    public show(): void {
        // this.win.show();
        if (!this.isVisible) {
            this.win.focus();
            if (is.windows()) {
                this.win.setPosition(this.position[0], this.position[1], false);
            } else if (is.osx()) {
                app.show();
            } else {
                this.win.show();
            }
            app.focus();
            this.isVisible = true;
        }
    }

    public hide(): void {
        if (this.isVisible) {
            this.position = this.win.getPosition();

            if (is.windows()) {
                this.win.setPosition(5000, 5000, false);
                this.win.minimize();
                this.win.showInactive();
            } else if (is.osx()) {
                app.hide();
            } else {
                this.win.hide();
            }

            this.send("changePackage", null); // clear any set packages in search
            this.isVisible = false;
        }
    }

    public toggle(): void {
        if (this._isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    public focus(): void {
        this.win.focus();
    }

    public closed(): void {
        this.win = {} as Electron.BrowserWindow;
        this.isExist = false;
    }

    public setFocusAfterDevToolOpen() {
        this.focus();
        setImmediate(() => this.focus());
    }
}

export default AbstractWindowController;

import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment as env } from '../../../environments/environment';
import {
  ApiService,
  NodeServices,
  App,
  Transports,
  NodeInfo,
  Message,
  FeedBackItem,
  UserService,
  ConnectServiceInfo,
  MessageItem,
  AutoStartConfig,
  AlertService
} from '../../service';
import { MatSnackBar, MatDialog, MatDialogRef } from '@angular/material';
import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  UpdateCardComponent,
  AlertComponent,
  LoadingComponent,
  TerminalComponent,
  SearchServiceComponent,
  WalletComponent
} from '../../components';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/timer';
import 'rxjs/add/operator/debounceTime';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Component({
  selector: 'app-sub-status',
  templateUrl: './sub-status.component.html',
  styleUrls: ['./sub-status.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SubStatusComponent implements OnInit, OnDestroy {
  task = new Subject();
  alertMsg = '';
  sshColumns = ['index', 'key', 'del'];
  displayedColumns = ['index', 'key', 'app', 'action'];
  transportColumns = ['index', 'upload', 'download', 'fromApp', 'fromNode', 'toNode', 'toApp'];
  appSource: SubStatusDataSource = null;
  sshSource: SubStatusDataSource = null;
  sockSource: SubStatusDataSource = null;
  transportSource: SubStatusDataSource = null;
  key = '';
  power = '';
  transports: Array<Transports> = [];
  status: NodeServices = null;
  apps: Array<App> = [];
  isManager = false;
  socketColor = 'close-status';
  sshColor = 'close-status';
  socketClientColor = 'close-status';
  sshClientColor = 'close-status';
  statrStatusCss = 'mat-primary';
  dialogTitle = '';
  sshTextarea = '';
  sshAllowNodes = [];
  sockTextarea = '';
  sockAllowNodes = [];
  sshConnectKey = '';
  taskTime = 1000;
  timer: Subscription = null;
  startRequest = false;
  feedBacks: Array<FeedBackItem> = [];
  formValidatorsSlice = [Validators.required, Validators.minLength(66), Validators.maxLength(66)];
  sshClientForm = new FormGroup({
    nodeKey: new FormControl('', this.formValidatorsSlice),
    appKey: new FormControl('', this.formValidatorsSlice),
  });
  socketClientForm = new FormGroup({
    nodeKey: new FormControl('', this.formValidatorsSlice),
    appKey: new FormControl('', this.formValidatorsSlice),
  });
  configForm = new FormGroup({
    DiscoveryAddresses: new FormControl(''),
    socksServer: new FormControl(''),
    sshServer: new FormControl('')
  });
  sshClientPort = 0;
  socketClientPort = 0;
  nodeVersion = '0.0.1';
  nodeTag = 'dev';
  _appData = new SubDatabase();
  _transportData = new SubDatabase();
  _sshServerData = new SubDatabase();
  _socketServerData = new SubDatabase();
  isProduction = env.production;
  clientConnectionInfo: ConnectServiceInfo | null;
  // socketClientConnectionInfo: ConnectServiceInfo | null;
  discoveries: Map<string, boolean>;
  debugData = '';
  messages: Array<Message> = [];
  showMsgs: Array<MessageItem> = [];
  dialogMode = '';
  autoStart: AutoStartConfig = null;
  dev = true;
  SshClient = 'sshc';
  SshServer = 'sshs';
  SocketClient = 'socksc';
  SocketServer = 'sockss';
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    public user: UserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private alert: AlertService) {
  }

  ngOnInit() {
    this.appSource = new SubStatusDataSource(this._appData);
    this.transportSource = new SubStatusDataSource(this._transportData);
    this.sshSource = new SubStatusDataSource(this._sshServerData);
    this.sockSource = new SubStatusDataSource(this._socketServerData);
    if (env.taskTime) {
      this.taskTime = env.taskTime;
    }
    const tmpTaskTime = Number(localStorage.getItem('_SKYWIRE_TASKTIME'));
    if (tmpTaskTime && tmpTaskTime > 0) {
      this.taskTime = tmpTaskTime;
    }
    this.route.queryParams.subscribe(params => {
      this.key = params.key;
      this.startTask();
      this.power = 'warn';
      this.isManager = env.isManager;
    });
    // this.alert.error('this is error message!');
  }
  ngOnDestroy() {
    this.close();
  }
  closeApp(ev: Event, key: string) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    if (!key) {
      this.alert.error('key is empty!');
      return;
    }
    console.log('close app:', key);
    const data = new FormData();
    data.append('key', key);
    this.api.closeApp(this.status.addr, data).subscribe(result => {
      if (result) {
        this.init();
      }
    });
  }
  openWallet(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    const ref = this.dialog.open(WalletComponent, {
      minWidth: '90%',
      height: '700px'
    });
    ref.componentInstance.key = this.key;
  }
  terminal(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    const ref = this.dialog.open(TerminalComponent, {
      panelClass: 'terminal-dialog',
      backdropClass: 'terminal-backdrop',
      width: '100%',
      disableClose: true
    });
    ref.componentInstance.addr = this.status.addr;
  }
  openDebug(ev: Event, content: any) {
    this.api.getDebugPage('192.168.0.2:6001').subscribe((res) => {
      this.debugData = res;
    }, err => {
      this.debugData = err.error.text;
    });
    this.dialog.open(content);
  }
  setFormValue(ev: Event, info: ConnectServiceInfo, form: string) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();

    const value = { nodeKey: info.nodeKey, appKey: info.appKey };
    switch (form) {
      case 'sshClient':
        this.sshClientForm.patchValue(value);
        break;
      case 'socketClient':
        this.socketClientForm.patchValue(value);
        break;
    }
    this.dialogMode = 'enter';
  }
  editTaskTime(time: number) {
    this.close();
    const newTime = time * 1000;
    if (newTime !== this.taskTime) {
      this.taskTime = time * 1000;
      localStorage.setItem('_SKYWIRE_TASKTIME', this.taskTime.toString());
      this.startTask();
    }
  }
  openLog(service: string, content: any) {
    this.showMsgs = [];
    const app = this.findService(service);
    if (app && app.key) {
      const data = new FormData();
      data.append('key', app.key);
      this.api.checkAppMsg(this.status.addr, data).subscribe((res) => {
        this.showMsgs = res;
        this.task.next();
      });
    }
    this.dialog.open(content, {
      panelClass: 'log-dialog'
    });
  }

  isUnread(service: string) {
    const app = this.findService(service);
    if (app && this.feedBacks) {
      const result = this.feedBacks.find(el => {
        return el.key === app.key;
      });
      if (!result) {
        return 0;
      }
      return result.unread;
    }
    return 0;
  }

  transportsTrackBy(index, transport) {
    return transport ? transport.from_node : undefined;
  }
  appTrackBy(index, app) {
    return app ? app.key : undefined;
  }
  connectSocket(ev: Event, action: string, info?: ConnectServiceInfo, ) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    const data = new FormData();
    let jsonStr = null;
    if (info) {
      jsonStr = info;
    } else {
      jsonStr = {
        label: '',
        nodeKey: this.socketClientForm.get('nodeKey').value,
        appKey: this.socketClientForm.get('appKey').value,
        count: 1
      };
    }
    if (!action || !jsonStr) {
      this.alert.error('action or params is empty!');
      return;
    }
    data.append('client', action);
    data.append('data', JSON.stringify(jsonStr));
    this.api.saveClientConnection(data).subscribe(res => {
      data.delete('data');
      data.delete('client');
    });
    if (info) {
      data.append('toNode', info.nodeKey);
      data.append('toApp', info.appKey);
    } else if (this.socketClientForm.valid) {
      data.append('toNode', this.socketClientForm.get('nodeKey').value);
      data.append('toApp', this.socketClientForm.get('appKey').value);
    }
    // if (!data.get('toNode') || !data.get('toApp')) {
    //   this.alert.error('params failed');
    //   return;
    // }
    this.api.connectSocketClicent(this.status.addr, data).subscribe(result => {
      this.task.next();
      const updateTask = setInterval(() => {
        if (this.socketClientPort > 0 && this.socketClientPort <= 65535) {
          clearInterval(updateTask);
          this.alert.close();
        }
      }, 500);
      this.alert.timer('connecting...', 15000);
    });

    this.dialog.closeAll();
  }
  connectSSH(ev: Event, action: string, info?: ConnectServiceInfo, ) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    const data = new FormData();
    let jsonStr = null;
    if (info) {
      jsonStr = info;
    } else {
      jsonStr = {
        label: '',
        nodeKey: this.sshClientForm.get('nodeKey').value,
        appKey: this.sshClientForm.get('appKey').value,
        count: 1
      };
    }
    if (!action || !jsonStr) {
      this.alert.error('action or params is empty!');
      return;
    }
    data.append('client', action);
    data.append('data', JSON.stringify(jsonStr));
    this.api.saveClientConnection(data).subscribe(res => {
      data.delete('data');
      data.delete('client');
    });
    if (info) {
      data.append('toNode', info.nodeKey);
      data.append('toApp', info.appKey);
    } else if (this.sshClientForm.valid) {
      data.append('toNode', this.sshClientForm.get('nodeKey').value);
      data.append('toApp', this.sshClientForm.get('appKey').value);
    }
    // if (!data.get('toNode') || !data.get('toApp')) {
    //   this.alert.error('params failed');
    //   return;
    // }
    this.api.connectSSHClient(this.status.addr, data).subscribe(result => {
      this.task.next();
      const updateTask = setInterval(() => {
        if (this.sshClientPort > 0 && this.sshClientPort <= 65535) {
          clearInterval(updateTask);
          this.alert.close();
        }
      }, 500);
      this.alert.timer('connecting...', 15000);
    });
    this.dialog.closeAll();
  }
  delAllowNode(ev: Event, index: number) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    if (index < 0) {
      this.alert.error('index is faild');
      return;
    }
    this.sshAllowNodes.splice(index, 1);
    const data = new FormData();
    data.append('data', this.sshAllowNodes.toString());
    this.api.runSSHServer(this.status.addr, data).subscribe(result => {
      if (result) {
        console.log('set ssh result:', result);
        this.sshTextarea = '';
        this.task.next();
      }
    });
  }
  delAllowSockNode(ev: Event, index: number) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    if (index < 0) {
      this.alert.error('index is faild');
      return;
    }
    this.sockAllowNodes.splice(index, 1);
    const data = new FormData();
    data.append('data', this.sockAllowNodes.toString());
    this.api.runSockServer(this.status.addr, data).subscribe(result => {
      if (result) {
        console.log('set socks result:', result);
        this.sockTextarea = '';
        this.task.next();
      }
    });
  }
  setSSH(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    let dataStr = '';
    if (this.sshAllowNodes.length > 0 && this.sshTextarea.trim()) {
      dataStr = this.sshAllowNodes + ',' + this.sshTextarea.trim();
    } else {
      dataStr = this.sshAllowNodes.toString();
    }
    const data = new FormData();
    data.append('data', dataStr);
    this.api.runSSHServer(this.status.addr, data).subscribe(result => {
      if (result) {
        console.log('set ssh result:', result);
        this.sshTextarea = '';
        this.task.next();
      }
    });
  }
  setSock(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    let dataStr = '';
    if (this.sockAllowNodes.length > 0 && this.sockTextarea.trim()) {
      dataStr = this.sockAllowNodes + ',' + this.sockTextarea.trim();
    } else {
      dataStr = this.sockAllowNodes.toString();
    }
    const data = new FormData();
    data.append('data', dataStr);
    this.api.runSSHServer(this.status.addr, data).subscribe(result => {
      if (result) {
        console.log('set ssh result:', result);
        this.sshTextarea = '';
        this.task.next();
      }
    });
  }
  checkUpdate(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    const ref = this.dialog.open(UpdateCardComponent, {
      panelClass: 'update-panel',
      width: '370px',
      disableClose: true,
      data: {
        version: this.nodeVersion,
        tag: this.nodeTag
      }
    });
    ref.componentInstance.nodeUrl = this.status.addr;
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.dialog.open(LoadingComponent, {
          panelClass: 'loading',
          disableClose: true,
          data: {
            taskTime: 120,
          }
        });
      }
    });
  }
  refresh(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    this.task.next();
    this.snackBar.open('Refreshed', 'Dismiss', {
      duration: 3000,
      verticalPosition: 'top',
      extraClasses: ['bg-success']
    });
  }
  runSocketServer(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    this.api.runSockServer(this.status.addr).subscribe(isOk => {
      if (isOk) {
        console.log('start socket server');
        this.task.next();
      }
    });
  }
  runSSHServer(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    this.api.runSSHServer(this.status.addr).subscribe(isOk => {
      if (isOk) {
        console.log('start ssh server');
        this.task.next();
      }
    });
  }
  reboot(ev: Event) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    console.log('reboot');
    this.api.reboot(this.status.addr).subscribe(isOk => {
      if (isOk) {
        if (this.task) {
          this.close();
        }
        this.startTask();
      }
    });
  }
  inputKeys(ev: Event, action: string, content: any) {
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    ev.preventDefault();
    if (!action) {
      this.snackBar.open('Unable to obtain historical connection information', 'Dismiss', {
        duration: 3000,
        verticalPosition: 'top',
        extraClasses: ['bg-warn']
      });
    } else {
      const data = new FormData();
      data.append('client', action);
      this.api.getClientConnection(data).subscribe((info: ConnectServiceInfo) => {
        this.clientConnectionInfo = info;
      });
    }
    this.dialogMode = '';
    this.sshClientForm.reset();
    this.socketClientForm.reset();
    this.dialog.open(content, {
      width: '450px',
      panelClass: 'multipage-dialog'
    });
  }
  openSettings(ev: Event, content: any, title: string) {
    if (!title) {
      return;
    }
    let nodes = [];
    if (this.status.apps && this.findService(this.SshServer)) {
      console.log('get sshs nodes');
      nodes = this.findService(this.SshServer).allow_nodes;
      this._sshServerData.push(nodes);
    }
    this.dialogTitle = title;
    this.dialog.open(content, {
      width: '800px'
    });
  }
  openSockSettings(ev: Event, content: any, title: string) {
    if (!title) {
      return;
    }
    let nodes = [];
    if (this.status.apps && this.findService(this.SocketServer)) {
      console.log('get socks nodes');
      nodes = this.findService(this.SocketServer).allow_nodes;
      this._socketServerData.push(nodes);
    }
    this.dialogTitle = title;
    this.dialog.open(content, {
      width: '800px',
    });
  }
  findService(search: string): App {
    if (!this.status || !this.status.apps) {
      return null;
    }
    const result = this.status.apps.find(el => {
      const tmp = el.attributes.find(attr => {
        return search === attr;
      });
      return search === tmp;
    });
    return result;
  }
  startTask() {
    this.init();
    this.task.subscribe(() => {
      this.init();
    });
    this.timer = Observable.timer(0, this.taskTime).subscribe(() => {
      this.task.next();
    });
  }
  close() {
    this.timer.unsubscribe();
  }
  isExist(search: string) {
    const result = this.status.apps.find(el => {
      const tmp = el.attributes.find(attr => {
        return search === attr;
      });
      return search === tmp;
    });
    return result !== undefined && result !== null;
  }
  setServiceStatus() {
    this.socketClientPort = 0;
    this.sshClientPort = 0;
    this.sshColor = 'close-status';
    this.sshClientColor = 'close-status';
    this.socketColor = 'close-status';
    this.socketClientColor = 'close-status';
    if (this.status.apps) {
      if (this.findService(this.SshServer)) {
        this.sshAllowNodes = this.findService(this.SshServer).allow_nodes;
      }
      if (this.findService(this.SocketServer)) {
        this.sockAllowNodes = this.findService(this.SocketServer).allow_nodes;
      }
      this._sshServerData.push(this.sshAllowNodes);
      this._socketServerData.push(this.sockAllowNodes);
      if (this.isExist(this.SshServer)) {
        this.sshColor = this.statrStatusCss;
      }
      if (this.isExist(this.SshClient)) {
        this.sshClientColor = this.statrStatusCss;
      }
      if (this.isExist(this.SocketServer)) {
        this.socketColor = this.statrStatusCss;
      }
      if (this.isExist(this.SocketClient)) {
        this.socketClientColor = this.statrStatusCss;
      }
    }
  }
  fillTransport() {
    if (env.isManager && this.status.addr) {
      this.transports = [];
      this.api.getNodeInfo(this.status.addr).subscribe((info: NodeInfo) => {
        if (info) {
          this.nodeVersion = info.version;
          this.nodeTag = info.tag;
          this.transports = info.transports;
          if (this.transports) {
            this.transports.sort((a1: Transports, a2: Transports) => {
              return a1.from_app.localeCompare(a2.from_app);
            });
          }
          this._transportData.push(this.transports);
          this.feedBacks = info.app_feedbacks;
          this.discoveries = info.discoveries;
        }
      }, err => {
        this._transportData.push(null);
      });
    }
  }
  setClientPort(client: string) {
    const app = this.findService(client);
    let port = -1;
    if (app && this.feedBacks) {
      const result = this.feedBacks.find(el => {
        return el.key === app.key;
      });
      if (!result) {
        return;
      }
      if (result.port) {
        port = result.port;
      }
      if (result.failed) {
        port = -1;
        this.alert.close();
      }
      // if (port > 0 && port <= 65535) {
      //   this.alert.close();
      // }
      switch (client) {
        case this.SshClient:
          if (this.sshClientPort !== port) {
            this.sshClientPort = port;
          }
          break;
        case this.SocketClient:
          if (this.socketClientPort !== port) {
            this.socketClientPort = port;
          }
          break;
      }
    }
  }

  fillApps() {
    if (env.isManager) {
      this.api.getApps(this.status.addr).subscribe((apps: Array<App>) => {
        this.status.apps = apps;
        this.setServiceStatus();

        this.setClientPort(this.SshClient);
        this.setClientPort(this.SocketClient);
        if (this.status.apps) {
          this.status.apps.sort((a1: App, a2: App) => {
            return a1.key.localeCompare(a2.key);
          });
        }
        this._appData.push(this.status.apps);
      }, err => {
        this._appData.push(null);
      });
    }
  }
  openConfigSettings(ev: Event, content: any) {
    this.configForm.reset();
    this.api.getAutoStart(this.status.addr).subscribe((config: AutoStartConfig) => {
      this.autoStart = config;
      this.configForm.patchValue({ 'socksServer': config.socks_server });
      this.configForm.patchValue({ 'sshServer': config.ssh_server });
    });
    this.dialog.open(content, {
      width: '800px'
    });
  }

  checkDiscoveryAddress(addresses: Array<string>) {
    let isok = false;
    for (let index = 0; index < addresses.length; index++) {
      const address = addresses[index].split('-');
      if (address.length !== 2) {
        return isok;
      }
      if (!address[0]) {
        return isok;
      }
      const afterStr = address[0].split(':');
      if (afterStr.length !== 2) {
        return isok;
      }
      const port = parseInt(afterStr[1], 10);
      if (port <= 0 || port > 65535) {
        return isok;
      }
      if (!address[1]) {
        return isok;
      }
      if (this.hexStringToByte(address[1]).length !== 33) {
        return isok;
      }
    }
    isok = true;
    return isok;
  }
  hexStringToByte(str) {
    if (!str) {
      return null;
    }
    const a = [];
    for (let i = 0, len = str.length; i < len; i += 2) {
      a.push(parseInt(str.substr(i, 2), 16));
    }
    return new Uint8Array(a);
  }

  updateSettings(ev: Event) {
    this.dialog.closeAll();
    const jsonStr = {
      // DiscoveryAddresses: this.configForm.get('DiscoveryAddresses').value.split(','),
      socks_server: this.configForm.get('socksServer').value,
      ssh_server: this.configForm.get('sshServer').value
    };
    const tmp = this.configForm.get('DiscoveryAddresses').value;
    if (tmp) {
      // TODO check discovery address
      const addresses = tmp.split(',');
      if (!this.checkDiscoveryAddress(addresses)) {
        this.alert.error('addresses is faild');
        return;
      }
      jsonStr['DiscoveryAddresses'] = addresses;
    }
    if (!this.key) {
      this.alert.error('node key is empty!');
      return;
    }
    const data = new FormData();
    data.append('key', this.key);
    data.append('data', JSON.stringify(jsonStr));
    this.api.setAutoStart(this.status.addr, data).subscribe(result => {
      console.log('set auto config:', result);
    });
    if (tmp) {
      console.log('update discovery address');
      this.api.setNodeConfig(data).subscribe(result => {
        if (result) {
          this.dialog.open(AlertComponent, {
            width: '45rem',
            panelClass: 'alert',
            data: {
              msg: 'Do you restart node immediately?',
              confirm: true
            }
          }).afterClosed().subscribe(isRestart => {
            if (isRestart) {
              this.api.updateNodeConfig(this.status.addr).subscribe(isSuccess => {
                if (isSuccess) {
                  this.dialog.open(LoadingComponent, {
                    panelClass: 'loading',
                    disableClose: true,
                    data: {
                      taskTime: 30,
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  }
  search(ev: Event, searchStr: string) {
    const ref = this.dialog.open(SearchServiceComponent, {
      minWidth: '1200px',
      height: '800px'
    });
    ref.componentInstance.nodeAddr = this.status.addr;
    ref.componentInstance.searchStr = searchStr;
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.init();
        this.dialog.closeAll();
        const updateTask = setInterval(() => {
          if (this.socketClientPort > 0 && this.socketClientPort <= 65535) {
            clearInterval(updateTask);
            this.alert.close();
          }
        }, 500);
        this.alert.timer('connecting...', 15000);
      }
    });
  }
  removeClientConnection(action: string, index: number) {
    const data = new FormData();
    if (!action) {
      this.alert.error('client label is empty!');
      return;
    }
    if (index < 0) {
      this.alert.error('index is faild!');
      return;
    }
    data.append('client', action);
    data.append('index', String(index));
    this.api.removeClientConnection(data).subscribe((result) => {
      if (result) {
        this.api.getClientConnection(data).subscribe((info: ConnectServiceInfo) => {
          this.clientConnectionInfo = info;
        });
      }
    });
  }
  init() {
    this.startRequest = true;
    if (this.key) {
      const data = new FormData();
      data.append('key', this.key);
      this.api.getNodeStatus(data).subscribe((nodeServices: NodeServices) => {
        if (nodeServices) {
          this.status = nodeServices;
          this.fillTransport();
          this.fillApps();
        }
      });
    } else {
    }
  }
}


export class SubDatabase {
  /** Stream that emits whenever the data has been modified. */
  dataChange: BehaviorSubject<any> = new BehaviorSubject<any>([]);
  isShow = false;
  get data(): any[] { return this.dataChange.value; }

  constructor() { }

  push(value: Array<any>) {
    if (!value || value.length <= 0) {
      this.isShow = false;
    } else {
      this.isShow = true;
    }
    this.dataChange.next(value);
  }
}

export class SubStatusDataSource extends DataSource<any> {
  size = 0;
  constructor(private _data: SubDatabase) {
    super();
  }
  connect(): Observable<any> {
    return this._data.dataChange;
  }

  disconnect() {
  }
}

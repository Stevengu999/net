import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { MatTooltip } from '@angular/material';
import { ApiService, Conn } from '../../service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-discovery-home',
  templateUrl: 'discovery-home.component.html',
  styleUrls: ['./discovery-home.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class DiscoveryHomeComponent implements OnInit {
  discoveryPubKey = '';
  nodes: Array<Conn> = [];
  showNodes: false;
  @ViewChild('copyTooltip') tooltip: MatTooltip;

  constructor(private api: ApiService, private titleService: Title) { }
  copy(result: boolean) {
    if (result) {
      this.tooltip.disabled = false;
      this.tooltip.message = 'copied!';
      this.tooltip.hideDelay = 500;
      this.tooltip.show();
      setTimeout(() => {
        this.tooltip.disabled = true;
      }, 500);
    }
  }
  refresh(ev: Event) {
    this.init();
  }
  init() {
    this.titleService.setTitle('Skywire Discovery');
    this.api.getServerInfo().subscribe(key => {
      if (key) {
        this.discoveryPubKey = key;
      }
    });
  }
  ngOnInit() {
    this.init();
    this.api.getAllNode().subscribe((resp: Array<Conn>) => {
      this.nodes = resp;
    });
  }
}
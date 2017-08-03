import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AppComponent } from './app.component';
import {
  ImViewComponent,
  ImRecentBarComponent,
  ImRecentItemComponent,
  ImHeadComponent,
  ImHistoryViewComponent,
  ImHistoryMessageComponent,
  CreateChatDialogComponent,
  AlertDialogComponent,
  ImInfoDialogComponent,
  EditorComponent
} from '../components';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SocketService, UserService, EmojiService } from '../providers';
import { ToolService } from '../providers/tool/tool.service';
import {
  MdCheckboxModule,
  MdMenuModule,
  MdIconModule,
  MdDialogModule,
  MdInputModule,
  MdButtonModule,
} from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'web-animations-js'
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';
import { HttpModule } from '@angular/http';

const PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};

@NgModule({
  declarations: [
    AppComponent,
    ImViewComponent,
    ImRecentBarComponent,
    ImRecentItemComponent,
    ImHeadComponent,
    ImHistoryViewComponent,
    ImHistoryMessageComponent,
    CreateChatDialogComponent,
    AlertDialogComponent,
    ImInfoDialogComponent,
    EditorComponent
  ],
  imports: [
    HttpModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    FlexLayoutModule,
    BrowserAnimationsModule,
    MdCheckboxModule,
    MdMenuModule,
    MdIconModule,
    MdDialogModule,
    MdInputModule,
    MdButtonModule,
    PerfectScrollbarModule.forRoot(PERFECT_SCROLLBAR_CONFIG)
  ],
  entryComponents: [
    CreateChatDialogComponent,
    AlertDialogComponent,
    ImInfoDialogComponent
  ],
  providers: [SocketService, UserService, ToolService, EmojiService],
  bootstrap: [AppComponent]
})
export class AppModule { }

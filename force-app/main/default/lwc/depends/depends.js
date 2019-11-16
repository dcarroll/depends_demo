/* eslint-disable guard-for-in */
import { LightningElement, api, track, wire } from 'lwc';
import findDependency from '@salesforce/apex/DepApiController.findDependency';
import addFieldToLayout from '@salesforce/apex/DepApiController.addFieldToLayout';
import removeFieldFromLayout from '@salesforce/apex/DepApiController.removeFieldFromLayout';
import getFirstRecordId from '@salesforce/apex/DepApiController.getFirstRecordId';
import getLayoutItemNames from '@salesforce/apex/DepApiController.getLayoutItemNames';
import { subscribe, unsubscribe } from 'lightning/empApi';
import { getRecordUi } from 'lightning/uiRecordApi';

export default class Depends extends LightningElement {

    @track dependsData; // Used for debugging
    @track records;
    @api isLoaded = false;
    @api accountRecordId = '0015500000dLdnhAAC';
    @api objectName = 'Account';

    actions = [
        { label: 'Insert Into Layout', name: 'insertIntoLayout' },
    ];
    
    @track row
    @api searchFieldName = 'TestField';// searchFieldName
    @track mdSearchType = 'CustomField';
    @track fieldNameToAdd = 'Field_To_Add__c';
    @track channelName = '/event/Deploy_Success__e'
    @track subsciption;
    @api formMode = 'view';
    @track fields = [];
    @track leftColumn = [];
    @track rightColumn = [];
    @track sections = [];
    @track layout = {}
    accountUI;

    @track columns = [
        { label: 'Host Comp Id', fieldName: 'MetadataComponentId' },
        { label: 'Host Comp Name', fieldName: 'MetadataComponentName' },
        { label: 'Host Comp Type', fieldName: 'MetadataComponentType' },
        { label: 'Target Comp Id', fieldName: 'RefMetadataComponentId' },
        { label: 'Target Comp Name', fieldName: 'RefMetadataComponentName' },
        { label: 'Target Comp Type', fieldName: 'RefMetadataComponentType', type: 'text' },
        { label: 'On Layout', fieldName: 'IsOnLayout', type: 'boolean' },
        { type: 'action',
            typeAttributes: {
                rowActions: this.getActions,
                menuAlignment: 'auto'
            } 
        },
    ];

    getActions(row, doneCallback) {
        window.console.log('calling "getActions"');
        const actions = [];

        if (row.IsOnLayout === true) {
            actions.push({
                'label': 'Remove From Layout', 
                'name': 'removeFieldFromLayout',
                'iconName': 'utility:clear',
            });
        } else {
            actions.push({
                'label': 'Add To Layout',
                'iconName': 'utility:insert_template',
                'name': 'addFieldToLayout'
            });
        }
        doneCallback(actions);    
    }

    get uniqueId() {
        return parseInt(Math.random() * 10000000, 10);
    }

    /*@wire(getRecordUi, { recordIds: '$accountRecordId', layoutTypes: 'Full', modes: 'View' })
    gotRecordUi(data) {
        window.console.log('calling "gotRecordUi"');
        if (data.error !== undefined) {
            window.console.log(data.error);
        } else {
            if (data.data !== undefined) {
                this.sections = [];
                const col1 = [];
                const col2 = [];
                // data.data.layouts.Account['012000000000000AAA'].Compact.View.sections[0].layoutRows[0].layoutItems[0].layoutComponents
                const accountLayout = data.data.layouts.Account;
                // eslint-disable-next-line guard-for-in
                for (const key in accountLayout) {
                    for (const layoutKey in accountLayout[key]) {
                        this.sections = accountLayout[key][layoutKey].View.sections;
                        for (const _section in this.sections) {
                            for (const _row in this.sections[_section].layoutRows) {
                                const layoutItems = this.sections[_section].layoutRows[_row].layoutItems;
                                for (let i = 0; i < layoutItems.length; i++) {
                                    const comp = layoutItems[i].layoutComponents[0];
                                    if ((i % 2) === 0) {
                                        this.leftColumn.push(comp.apiName);
                                    } else {
                                        this.rightColumn.push(comp.apiName);
                                    }
                                }
                            }
                        }
                    }
                }
                // window.console.log(data);
                this.leftColumn = col1;
                this.rightColumn = col2;
                //this.fields = col1.concat(col2);
                return col1.concat(col2);
            }
        }
        return 0;
    }*/

    connectedCallback() {
        window.console.log('calling "connectedCallback"');
        this.isLoaded = true;
        this.findCompDependency()
        .then(() => {
            getLayoutItemNames({ layoutName: 'Account-Account Layout' })
            .then(data => { 
                debugger;
                //this.layout = JSON.parse(data);
                //this.sections = this.layout.layoutSections;
                //this.sections = this.sections.splice(2);
                this.fields = JSON.parse(data);
                getFirstRecordId()
                .then(res => {
                    this.accountRecordId = res;
                })
                .catch(e => {
                    window.console.log(e);
                })
            })
            .catch(e => {
                window.console.log(e);
            });
        })
    }

    async findCompDependency() {
        window.console.log('calling "findCompDependency"');
        const searchValues = { compType: this.mdSearchType, fieldNameToFind: this.searchFieldName, fieldNameToAdd: this.fieldNameToAdd };

        findDependency(searchValues).then(result => {
            this.records = JSON.parse(result);
            this.dependsData = JSON.stringify(this.records, null, 4);
        }).catch(e => {
            window.console.log(e);
        });
    }

    doAction(event) {
        window.console.log('calling "doAction"');
        this.handleSubscribe()
        .then(() => {
            const action = event.detail.action;
            this.row = event.detail.row;
            if (action.name === 'addFieldToLayout') {
                addFieldToLayout({ fieldNameToFind: this.searchFieldName, fieldNameToAdd: this.fieldNameToAdd, layoutToAddFieldTo: this.row.LayoutFullName })
                .then(() => {
                    window.console.log('Done, waiting for event...');
                })
                .catch(e => {
                    window.console.log(e);
                });
            } else if (action.name === 'removeFieldFromLayout') {
                removeFieldFromLayout({ fieldNameToRemove: this.fieldNameToAdd, layoutToRemoveFieldFrom: this.row.LayoutFullName })
                .then(() => {
                    window.console.log('Done, waiting for event...');
                })
                .catch(e => {
                    window.console.log(e);
                });
            }
        });
    }

    async handleSubscribe() {
        window.console.log('calling "handleSubscribe"');
        this.accountRecordId = '';
        const comp = this;
        // Callback invoked whenever a new event message is received
        const messageCallback = function(response) {
            window.console.log('in the messageCallback defined in handleSubscribe');
            comp.messageReceivedCallback(response);
        }

        this.toggle();
        // Invoke subscribe method of empApi. Pass reference to messageCallback
        subscribe(this.channelName, -1, messageCallback)
        .then(response => {
            // Response contains the subscription information on successful subscribe call
            window.console.log('Successfully subscribed to : ', JSON.stringify(response.channel));
            this.subscription = response;            
        })
        .catch(e => {
            window.console.log(e);
        });
    }

    messageReceivedCallback() {
        window.console.log('calling "messageReceivedCallback"');
        this.findCompDependency({ compType: this.mdSearchType, fieldNameToFind: this.searchFieldName, fieldNameToAdd: this.fieldNameToAdd })
        .then(() => {
            getFirstRecordId()
            .then(data => {
                this.accountRecordId = data;
                //getLayoutItemNames({ layoutName: 'Account-Account Layout' })
                //.then(res => {
                //    this.fields = res;
                //})
                //.catch(e => {
                //    window.console.log(e);
                //});
            })
            .catch(e => {
                window.console.log(e);
            })
            this.handleUnsubscribe();
        })
    }

    handleUnsubscribe() {
        window.console.log('calling "handleUnsubscribe"');
        unsubscribe(this.subscription, response => {
            window.console.log('unsubscribe() response: ', JSON.stringify(response));
            this.toggle();
            // Response is true for successful unsubscribe
            const rid = this.accountRecordId;
            //this.objectName = 'Contact';
            //this.objectName = 'Account'
            this.accountRecordId = '';
            this.accountRecordId = rid;
            //this.formMode = 'view';
        });
    }

    toggle() {
        window.console.log('calling "toggle"');
        this.isLoaded = !this.isLoaded;
    }

}
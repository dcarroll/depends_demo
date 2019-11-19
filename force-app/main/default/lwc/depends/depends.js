import { LightningElement, api, track } from 'lwc';
import findDependency from '@salesforce/apex/DepApiController.findDependency';
import addFieldToLayout from '@salesforce/apex/DepApiController.addFieldToLayout';
import removeFieldFromLayout from '@salesforce/apex/DepApiController.removeFieldFromLayout';
import { subscribe, unsubscribe } from 'lightning/empApi';

export default class Depends extends LightningElement {

    @track dependsData; // Used for debugging
    @track records;
    @api isLoaded = false;
    @track accountRecordId;

    actions = [
        { label: 'Insert Into Layout', name: 'insertIntoLayout' },
    ];
    
    @track row
    @api searchFieldName = 'TestField';// searchFieldName
    @track mdSearchType = 'CustomField';
    @track fieldNameToAdd = 'Field_To_Add__c';
    @track channelName = '/event/Deploy_Success__e'
    @track subsciption;

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

    connectedCallback() {
        this.isLoaded = true;
        window.console.log('Calling onClick from connectedCallback');
        this.handleOnClick();
    }

    toggle() {
        this.isLoaded = !this.isLoaded;
    }

    getActions(row, doneCallback) {
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

    handleOnClick() {
        window.console.log('Calling findCompDependency from handleOnClick');
        this.findCompDependency({ compType: this.mdSearchType, fieldNameToFind: this.searchFieldName, fieldNameToAdd: this.fieldNameToAdd })
    }

    async handleSubscribe() {
        const comp = this;
        // Callback invoked whenever a new event message is received
        const messageCallback = function(response) {
            window.console.log('Calling findCompDependency from messageCallback in handleSubscribe\nResonse: ' + response);
            comp.findCompDependency({ compType: comp.mdSearchType, fieldNameToFind: comp.searchFieldName, fieldNameToAdd: comp.fieldNameToAdd });

            comp.handleUnsubscribe();
            // Response contains the payload of the new message received
        };
        this.toggle();
        // Invoke subscribe method of empApi. Pass reference to messageCallback
        subscribe(this.channelName, -1, messageCallback).then(response => {
            // Response contains the subscription information on successful subscribe call
            window.console.log('Successfully subscribed to : ', JSON.stringify(response.channel));
            this.subscription = response;            
        });
    }

    handleUnsubscribe() {
        unsubscribe(this.subscription, response => {
            window.console.log('unsubscribe() response: ', JSON.stringify(response));
            this.toggle();
            // Response is true for successful unsubscribe
        });
    }

    findCompDependency(searchValues) {
        findDependency(searchValues).then(result => {
            this.records = JSON.parse(result);
            this.dependsData = JSON.stringify(this.records, null, 4);
        }).catch(e => {
            window.console.log(e);
        });
    }

    doAction(event) {
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
}
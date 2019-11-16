public class DepApiController {

    public static List<Object> doDepencencyQuery(String criteria) {
        NamedCredential nc = new NamedCredential();
        Http h = new Http();
        HttpRequest req = new HttpRequest();

        req.setEndpoint('callout:Depends/services/data/v47.0/tooling/query?q=' +
                    ReplaceSpaces('Select MetadataComponentId, MetadataComponentName, MetadataComponentNamespace, ' +
                        'MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, ' +
                        'RefMetadataComponentNamespace, RefMetadataComponentType From MetadataComponentDependency ' +
                        'Where ' + criteria));

        req.setMethod('GET');
        HttpResponse resp = h.send(req);
        Map<String, Object> jsonObj = (Map<String, Object>)JSON.deserializeUntyped(resp.getBody());
        return (List<Object>)jsonObj.get('records');
    }

    @AuraEnabled(cacheable=false)
    public static String getFirstRecordId() {
        Account acct = [Select Id From Account Limit 1];
        return acct.Id;
    }

    @Auraenabled(cacheable=false)
    public static string findDependency(String compType, String fieldNameToFind, String fieldNameToAdd) {
        List<Object> records = doDepencencyQuery('RefMetadataComponentType=\'' + compType + '\''); // (List<Object>)jsonObj.get('records');
        for (Integer i = 0; i < records.size(); i++) {
            Map<String, Object> obj = (Map<String, Object>)records[i];
            if ((String)obj.get('RefMetadataComponentName') == fieldNameToFind) {
                obj.put('LayoutFullName', getLayoutById((String)obj.get('MetadataComponentId')).get('FullName') + '');
                obj.put('IsOnLayout', isOnTargetLayout((String)obj.get('MetadataComponentName'), compType, fieldNameToAdd));
            } else {
                records.remove(i);
                i--;
            }
        }

        return JSON.serialize(records);
    }

    public static Map<String, Object> getLayoutById(String layoutId) {
        NamedCredential nc = new NamedCredential();
        Http h = new Http();
        HttpRequest req = new HttpRequest();

        req.setEndpoint('callout:Depends/services/data/v47.0/tooling/sobjects/Layout/' + layoutId);
        req.setMethod('GET');
        HttpResponse resp = h.send(req);
        Map<String, Object> jsonObj = (Map<String, Object>)JSON.deserializeUntyped(resp.getBody());
        System.debug(jsonObj.get('FullName'));
        return jsonObj;
    }

    public static Boolean isOnTargetLayout(String targetLayout, String compType, String fieldNameToAdd) {
        List<Object> records = doDepencencyQuery('RefMetadataComponentType=\'' + compType + '\''); // (List<Object>)jsonObj.get('records');
        if (fieldNameToAdd.endsWith('__c')) {
            fieldNameToAdd = fieldNameToAdd.substring(0, fieldNameToAdd.length() - 3);
        }
        System.debug('Records found: ' + records.size());

        for (Integer i = 0; i < records.size(); i++) {
            Map<String, Object> obj = (Map<String, Object>)records[i];
            System.debug('Checking: ' + obj.get('RefMetadataComponentName') +' == ' + fieldNameToAdd);
            //System.debug('FieldName to add: ' + fieldNameToAdd + '\nMetadataComponentName: ' + obj.get('RefMetadataComponentName'));
            if ((String)obj.get('RefMetadataComponentName') == fieldNameToAdd) {
                System.debug('\n\n\nFound It\n\n\n');
                System.debug('\nfound layout name: ' + obj.get('MetadataComponentName'));
                if ((String)obj.get('MetadataComponentName') == targetLayout) {
                    return true;
                }
            }
        }
        return false;
    }

    public static string ReplaceSpaces(String soql) {
        return soql.replace(' ', '+');
    }

    @AuraEnabled(cacheable=false)
    public static void addFieldToLayout(String fieldNameToFind, String fieldNameToAdd, String layoutToAddFieldTo) {
        List<String> componentNameList =
        new List<String>{layoutToAddFieldTo};
        System.debug('\n\nLayout to add field to: ' + layoutToAddFieldTo + '\n\n');
        // Retrieve components that are records of custom metadata types based on name
        List<Metadata.Metadata> components = Metadata.Operations.retrieve( Metadata.MetadataType.LAYOUT, componentNameList);        
        Metadata.Layout theLayout = (Metadata.Layout) components.get(0);

        List<Metadata.LayoutSection> sections = theLayout.layoutSections;
        Integer insertIndex;
        List<Metadata.LayoutItem> itemList;

        for (Metadata.LayoutSection mls : sections) {
            List<Metadata.LayoutColumn> cols = mls.layoutColumns;
            for (Metadata.LayoutColumn col : cols) {
                if (col.layoutItems != null) {
                    Integer i = 0;
                    System.debug('Looking for field: ' + fieldNameToFind);
                    for (Metadata.LayoutItem item : col.layoutItems) {
                        System.debug(JSON.serialize(item));
                        if (item.field == fieldNameToFind || item.field == fieldNameToFind + '__c') {
                            System.debug('\n\nFound the field: ' + item.field + '\n\n');
                            if (i == col.layoutItems.size() - 1) {
                                insertIndex = -1;
                                // col.layoutItems.add(newItem);
                            } else {
                                insertIndex = i;
                                // col.layoutItems.add(i+1, newItem);
                            }
                            itemList = col.layoutItems;
                        } else {
                            System.debug('\tField: ' + item.field);
                        }
                        i++;
                    }
                }
            }
        } 
        Metadata.LayoutItem newItem =new Metadata.LayoutItem();
        newItem.field = fieldNameToAdd;
        newItem.showLabel = true;
        if (insertIndex == -1) {
            itemList.add(newItem);
        } else {
            itemList.add(insertIndex + 1, newItem);
        }

        Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
        mdContainer.addMetadata(theLayout);

        // Enqueue deploy
        DeployCallback callback = new DeployCallback();
        Metadata.Operations.enqueueDeployment(mdContainer, callback);
    }

    public static Metadata.Layout getLayout(String layoutName) {
        List<String> componentNameList = new List<String>{layoutName};
        // Retrieve components that are records of custom metadata types based on name
        List<Metadata.Metadata> components = Metadata.Operations.retrieve(
            Metadata.MetadataType.LAYOUT, componentNameList);
        System.debug(components);
        
        return (Metadata.Layout) components.get(0);
    }

    @AuraEnabled(cacheable=false)
    public static string getLayoutItemNames(String layoutName) {
        Metadata.Layout layout = getLayout(layoutName);
        List<String> items = new List<String>();
        List<Metadata.LayoutSection> sections = layout.layoutSections;
        List<Metadata.LayoutItem> itemList;
        for (Metadata.LayoutSection mls : sections) {
            List<Metadata.LayoutColumn> cols = mls.layoutColumns;
            for (Metadata.LayoutColumn col : cols) {
                if (col.layoutItems != null) {
                    for (Metadata.LayoutItem item : col.layoutItems) {
                        if (item.field != null) {
                            items.add(item.field);
                        }
                    }
                }
            }
        }
        return JSON.serialize(items);
    }

    @AuraEnabled(cacheable=false)
    public static void removeFieldFromLayout(String fieldNameToRemove, String layoutToRemoveFieldFrom) {
        List<String> componentNameList = new List<String>{layoutToRemoveFieldFrom};
        // Retrieve components that are records of custom metadata types based on name
        List<Metadata.Metadata> components = Metadata.Operations.retrieve(
            Metadata.MetadataType.LAYOUT, componentNameList);
        System.debug(components);
        
        Metadata.Layout theLayout = (Metadata.Layout) components.get(0);
        List<Metadata.LayoutSection> sections = theLayout.layoutSections;
        Integer itemToRemove;
        List<Metadata.LayoutItem> itemList;
        for (Metadata.LayoutSection mls : sections) {
            System.debug('Section: ' + mls.label);
            List<Metadata.LayoutColumn> cols = mls.layoutColumns;
            for (Metadata.LayoutColumn col : cols) {
                if (col.layoutItems != null) {
                    Integer i = 0;
                    for (Metadata.LayoutItem item : col.layoutItems) {
                        if (item.field == fieldNameToRemove || item.field == fieldNameToRemove + '__c') {
                            itemToRemove = i;
                            itemList = col.layoutItems;
                            break;
                        } else {
                            System.debug('\tField: ' + item.field);
                        }
                        i++;
                    }
                }
            }
        }
        itemList.remove(itemToRemove);

        Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
        mdContainer.addMetadata(theLayout);

        // Enqueue deploy
        DeployCallback callback = new DeployCallback();
        Metadata.Operations.enqueueDeployment(mdContainer, callback);
    }
}
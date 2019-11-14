public class DeployCallback implements Metadata.DeployCallback {
    public void handleResult(Metadata.DeployResult result,
                             Metadata.DeployCallbackContext context) {
        if (result.status == Metadata.DeployStatus.Succeeded) {
            // Deployment was successful
            System.debug('Deployment was successful');
            Deploy_Success__e ev = new Deploy_Success__e();
            ev.Status__c = 'Success';
            Database.SaveResult res = EventBus.publish(ev);
        } else {
            System.debug('Deployment was not successful\nError Message: ' + result);
            Deploy_Success__e ev = new Deploy_Success__e();
            ev.Status__c = 'Failed';
            Database.SaveResult res = EventBus.publish(ev);
        }
    }
}

// Initialize Office.js
Office.onReady(() => {
  console.log('Commands initialized');
});

// Archive email command handler
function archiveEmail(event: Office.AddinCommands.Event) {
  const item = Office.context.mailbox.item;
  
  if (!item) {
    console.error('No email item selected');
    event.completed();
    return;
  }

  // Get email data
  const from = item.from?.emailAddress || '';
  const subject = item.subject || '';
  
  // Get body
  item.body.getAsync(Office.CoercionType.Text, async (result) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const body = result.value;
      
      try {
        // TODO: Replace with actual FRIDAY API call
        // await fetch('https://46.224.13.250/api/trpc/emails.create', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ from, subject, body }),
        // });
        
        console.log('Email archived:', { from, subject });
        
        // Show success notification
        Office.context.mailbox.item?.notificationMessages.addAsync('archive-success', {
          type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
          message: 'E-Mail erfolgreich archiviert',
          icon: 'icon-16',
          persistent: false,
        });
      } catch (error) {
        console.error('Archive failed:', error);
        
        // Show error notification
        Office.context.mailbox.item?.notificationMessages.addAsync('archive-error', {
          type: Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage,
          message: 'Fehler beim Archivieren',
          icon: 'icon-16',
          persistent: false,
        });
      }
    }
    
    event.completed();
  });
}

// Register functions
(Office as any).actions.associate('archiveEmail', archiveEmail);


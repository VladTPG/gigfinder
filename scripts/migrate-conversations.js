const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } = require('firebase/firestore');


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateConversations() {
  try {
    console.log('Starting conversation migration...');
    
    // Get all accepted applications
    const applicationsQuery = query(
      collection(db, 'gigApplications'),
      where('status', '==', 'accepted')
    );
    
    const applicationsSnapshot = await getDocs(applicationsQuery);
    const acceptedApplications = applicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${acceptedApplications.length} accepted applications`);
    
    let created = 0;
    let skipped = 0;
    
    for (const application of acceptedApplications) {
      try {
        // Check if conversation already exists
        const conversationsQuery = query(
          collection(db, 'gigConversations'),
          where('gigId', '==', application.gigId),
          where('artistId', '==', application.applicantId)
        );
        
        const existingConversations = await getDocs(conversationsQuery);
        
        if (!existingConversations.empty) {
          console.log(`Conversation already exists for gig ${application.gigId} and artist ${application.applicantId}`);
          skipped++;
          continue;
        }
        
        // Get gig data
        const gigQuery = query(
          collection(db, 'gigs'),
          where('__name__', '==', application.gigId)
        );
        const gigSnapshot = await getDocs(gigQuery);
        
        if (gigSnapshot.empty) {
          console.log(`Gig not found: ${application.gigId}`);
          continue;
        }
        
        const gigData = { id: gigSnapshot.docs[0].id, ...gigSnapshot.docs[0].data() };
        
        // Get venue manager data
        const userQuery = query(
          collection(db, 'users'),
          where('__name__', '==', gigData.createdBy)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
          console.log(`Venue manager not found: ${gigData.createdBy}`);
          continue;
        }
        
        const venueManager = userSnapshot.docs[0].data();
        
        // Create conversation
        const conversationData = {
          gigId: gigData.id,
          gigTitle: gigData.title,
          venueManagerId: gigData.createdBy,
          venueManagerName: venueManager.profile.firstName && venueManager.profile.lastName 
            ? `${venueManager.profile.firstName} ${venueManager.profile.lastName}`
            : venueManager.profile.username,
          artistId: application.applicantId,
          artistName: application.applicantName,
          artistType: application.applicantType,
          unreadCount: {
            venueManager: 0,
            artist: 0,
          },
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'gigConversations'), conversationData);
        console.log(`Created conversation ${docRef.id} for gig "${gigData.title}"`);
        created++;
        
      } catch (error) {
        console.error(`Error processing application ${application.id}:`, error);
      }
    }
    
    console.log(`Migration completed! Created: ${created}, Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateConversations(); 
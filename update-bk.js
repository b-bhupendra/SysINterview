const fs = require('fs');

let content = fs.readFileSync('src/app/knowledge-base.ts', 'utf8');

const offlineData = {
  'tinyurl': {
    theory: "URL shortening creates shorter aliases for long URLs to save space. We can use a hash function (MD5/SHA256) on the original URL and encode it to Base62. Alternatively, generate random 6-character strings offline using a Key Generation Service (KGS) and store them in a database for fast retrieval.",
    components: "Web Servers, Key Generation Service (KGS), Used/Unused Key DB, Cache (Memcached/Redis), Database (NoSQL like Cassandra)",
    bottlenecks: "Database read load can be a bottleneck for popular links. Adding a caching layer (LRU) helps. Single point of failure in KGS can be mitigated with a standby replica. Distributed Denial of Service (DDoS) can be handled using an API Rate Limiter.",
    diagramHints: "Draw clients connecting to a Load Balancer, which routes to Web Servers. Web servers read from an in-memory Cache and a NoSQL Database. Show a background Key Generation Service populating the database with unused keys."
  },
  'pastebin': {
    theory: "Pastebin allows users to store plain text. It requires generating a unique URL (similar to a URL shortener) and storing potentially large text blocks. A Key Generation Service (KGS) can be used to generate keys, and we can separate metadata storage from object storage.",
    components: "Key Generation Service, Metadata Database (SQL/NoSQL), Object Storage (S3), Cache",
    bottlenecks: "Handling massive read requests requires caching. Writing large text blocks limits concurrent connections. Separating read and write servers can prevent uploads from starving read requests.",
    diagramHints: "Show a split between Read Servers and Write Servers. Write servers talk to Object Storage (S3) for payloads and a Metadata DB for the URL mapping. Add a Cleanup Service that removes expired pastes."
  },
  'instagram': {
    theory: "Instagram is a read-heavy system (e.g., 200:1 read-write ratio). It stores user metadata, social graphs (follows), and photos. Photo metadata is stored in a partitioned database, while media files go to distributed object storage. Newsfeed is generated offline to ensure <200ms latency.",
    components: "Photo Storage (S3/HDFS), Metadata DB (Cassandra/MySQL), Newsfeed Generation Service, CDN",
    bottlenecks: "Generating newsfeeds synchronously is too slow. Precompute them offline. The social graph (celebrities with millions of followers) causes hotspots. Consider a hybrid push/pull model for celebrity feeds.",
    diagramHints: "Draw Image Storage (S3), Metadata Storage, and a dedicated 'Newsfeed Generation Service'. Show users uploading via Write API and pulling feeds via Read API. Introduce CDNs for media."
  },
  'dropbox': {
    theory: "Cloud storage syncs files between devices. Storing large files natively is inefficient. We break files into smaller chunks (e.g., 4MB). When a file is updated, only the modified chunk is synchronized. We also use data deduplication based on chunk hashes.",
    components: "Client Watcher/Chunker, Block/Object Storage (S3), Metadata DB, Synchronization Service, Message Queuing Service (Kafka/RabbitMQ)",
    bottlenecks: "Syncing chunks concurrently requires robust conflict resolution and ACID transactions for metadata. Bandwidth is bottlenecked without chunking and deduplication.",
    diagramHints: "Draw the 'Chunker' on the client side. The client talks to Block Servers directly for data uploading, and to Metadata Servers for syncing file structure. Include a Message Queue notifying other online devices."
  },
  'facebook-messenger': {
    theory: "Chat systems require full-duplex communication (WebSockets or Long Polling) for real-time delivery. Messages are stored persistently (HBase/Cassandra) using a sequence number per user for ordering.",
    components: "Chat Servers (WebSocket), Session/Presence Server, NoSQL Database (HBase/Cassandra), Push Notification Service",
    bottlenecks: "Managing millions of concurrent open HTTP connections. The backend DB needs to handle super high write throughput. Presence service state changes (online/offline) cause huge fanout traffic.",
    diagramHints: "Show users connected to Chat Servers with persistent WebSockets. Chat Servers talk to a Presence DB and write to a massive NoSQL Database (HBase) concurrently. Use a Push Notification server for offline users."
  },
  'twitter': {
    theory: "Twitter is heavily read-biased. It revolves around a publish/subscribe fanout model. When a user posts, it 'fans out' to followers' timelines. Due to huge celebrity followings, a hybrid approach (push for normal users, pull for celebrities) is often used.",
    components: "Write/Post API servers, Read/Timeline API servers, Fanout Service (Message broker), In-memory Cache (Redis), Blob storage",
    bottlenecks: "Celebrity fanout (e.g., millions of followers) can cause extreme latency. Using mixed models (pulling celebrity tweets at read-time instead of pushing to all followers) fixes this.",
    diagramHints: "Draw standard users publishing to a Fanout Service which pushes updates to Redis caches of followers. Show celebrity tweets being kept in a separate global Cache and merged at read-time (hybrid fanout)."
  },
  'youtube': {
    theory: "Video streaming involves video ingestion, encoding into multiple formats, and streaming distribution via Content Delivery Networks (CDN). Video ingestion uses block chunking to support resuming uploads.",
    components: "Upload Servers, Encoding/Transcoding Service, CDN (Edge Servers), Metadata DB, BigTable for Thumbnails",
    bottlenecks: "Serving videos directly from origin servers would crush bandwidth. CDNs solve this. Encoding videos synchronously slows down availability (use a Message Queue and background workers).",
    diagramHints: "Show Video Upload flow into a Processing Queue where Worker Nodes perform Encoding. Encoded videos are pushed to a CDN. Clients stream video directly from the Nearest CDN."
  }
};

let enhancedContent = content.replace(
  /export interface SystemDesignScenario \{([\s\S]*?)\}/,
  "export interface SystemDesignScenario {\n  id: string;\n  title: string;\n  description: string;\n  requirements: string[];\n\n  theory?: string;\n  components?: string[];\n  bottlenecks?: string[];\n  diagramHints?: string;\n}"
);

for (const id in offlineData) {
  const data = offlineData[id];
  const regex = new RegExp("(id:\\s*'" + id + "',[\\s\\S]*?requirements:\\s*\\[[\\s\\S]*?\\],)(\\n\\s*}\\s*,?)");
  const comps = data.components.split(',').map(s => "'" + s.trim().replace(/'/g, "\\'") + "'").join(', ');
  const bots = data.bottlenecks.replace(/'/g, "\\'");
  const theory = data.theory.replace(/'/g, "\\'");
  const diag = data.diagramHints.replace(/'/g, "\\'");
  
  enhancedContent = enhancedContent.replace(regex, "$1\n    theory: '" + theory + "',\n    components: [" + comps + "],\n    bottlenecks: ['" + bots + "'],\n    diagramHints: '" + diag + "'$2");
}

fs.writeFileSync('src/app/knowledge-base.ts', enhancedContent);
console.log('Knowledge base updated!');

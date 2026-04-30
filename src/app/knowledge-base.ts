export interface SystemDesignScenario {
  id: string;
  title: string;
  description: string;
  requirements: string[];

  theory?: string;
  components?: string[];
  bottlenecks?: string[];
  diagramHints?: string;
}

export const SCENARIOS: SystemDesignScenario[] = [
  {
    id: 'tinyurl',
    title: 'Link Shortener',
    description: 'Design a service that creates abbreviated aliases for lengthy URLs, similar to bit.ly or TinyURL.',
    requirements: [
      'Generate a unique, shorter alias for any given link.',
      'Redirect the abbreviated link to the original destination.',
      'Support user-defined custom aliases.',
      'Implement expiration for generated links.',
      'Ensure high availability and low latency.',
      'Aliases must be unguessable to prevent scraping.',
    ],
    theory: 'URL shortening creates shorter aliases for long URLs to save space. We can use a hash function (MD5/SHA256) on the original URL and encode it to Base62. Alternatively, generate random 6-character strings offline using a Key Generation Service (KGS) and store them in a database for fast retrieval.',
    components: ['Web Servers', 'Key Generation Service (KGS)', 'Used/Unused Key DB', 'Cache (Memcached/Redis)', 'Database (NoSQL like Cassandra)'],
    bottlenecks: ['Database read load can be a bottleneck for popular links. Adding a caching layer (LRU) helps. Single point of failure in KGS can be mitigated with a standby replica. Distributed Denial of Service (DDoS) can be handled using an API Rate Limiter.'],
    diagramHints: 'Draw clients connecting to a Load Balancer, which routes to Web Servers. Web servers read from an in-memory Cache and a NoSQL Database. Show a background Key Generation Service populating the database with unused keys.'
  },
  {
    id: 'pastebin',
    title: 'Text Snippet Hosting',
    description: 'Design a web service where users share plain text snippets via generated URLs.',
    requirements: [
      'Provide a random URL upon pasting text data.',
      'Support data expiration after a predefined duration.',
      'Option for custom URLs for snippets.',
      'Guarantee high reliability (no data loss) and uninterrupted availability.',
    ],
    theory: 'Pastebin allows users to store plain text. It requires generating a unique URL (similar to a URL shortener) and storing potentially large text blocks. A Key Generation Service (KGS) can be used to generate keys, and we can separate metadata storage from object storage.',
    components: ['Key Generation Service', 'Metadata Database (SQL/NoSQL)', 'Object Storage (S3)', 'Cache'],
    bottlenecks: ['Handling massive read requests requires caching. Writing large text blocks limits concurrent connections. Separating read and write servers can prevent uploads from starving read requests.'],
    diagramHints: 'Show a split between Read Servers and Write Servers. Write servers talk to Object Storage (S3) for payloads and a Metadata DB for the URL mapping. Add a Cleanup Service that removes expired pastes.'
  },
  {
    id: 'instagram',
    title: 'Photo Sharing Network',
    description: 'Design a social network for sharing photos, following users, and generating personalized feeds.',
    requirements: [
       'Support uploading, downloading, and viewing visual media.',
       'Provide search functionality for media titles.',
       'Allow users to follow one another.',
       'Compute and display a personalized feed of top followed content.',
       'Maintain high availability and feed generation latency under 200ms.',
    ],
    theory: 'Instagram is a read-heavy system (e.g., 200:1 read-write ratio). It stores user metadata, social graphs (follows), and photos. Photo metadata is stored in a partitioned database, while media files go to distributed object storage. Newsfeed is generated offline to ensure <200ms latency.',
    components: ['Photo Storage (S3/HDFS)', 'Metadata DB (Cassandra/MySQL)', 'Newsfeed Generation Service', 'CDN'],
    bottlenecks: ['Generating newsfeeds synchronously is too slow. Precompute them offline. The social graph (celebrities with millions of followers) causes hotspots. Consider a hybrid push/pull model for celebrity feeds.'],
    diagramHints: 'Draw Image Storage (S3), Metadata Storage, and a dedicated \'Newsfeed Generation Service\'. Show users uploading via Write API and pulling feeds via Read API. Introduce CDNs for media.'
  },
  {
    id: 'dropbox',
    title: 'Cloud Storage & Sync',
    description: 'Design a file hosting solution that synchronizes user data across multiple devices remotely.',
    requirements: [
       'Support reliable file upload and download across devices.',
       'Enable secure file and folder sharing.',
       'Synchronize modifications automatically across a user\'s devices.',
       'Handle large file sizes efficiently natively.',
       'Enforce strict ACID properties for file metadata.',
       'Allow offline edits that sync when connectivity is restored.',
    ],
    theory: 'Cloud storage syncs files between devices. Storing large files natively is inefficient. We break files into smaller chunks (e.g., 4MB). When a file is updated, only the modified chunk is synchronized. We also use data deduplication based on chunk hashes.',
    components: ['Client Watcher/Chunker', 'Block/Object Storage (S3)', 'Metadata DB', 'Synchronization Service', 'Message Queuing Service (Kafka/RabbitMQ)'],
    bottlenecks: ['Syncing chunks concurrently requires robust conflict resolution and ACID transactions for metadata. Bandwidth is bottlenecked without chunking and deduplication.'],
    diagramHints: 'Draw the \'Chunker\' on the client side. The client talks to Block Servers directly for data uploading, and to Metadata Servers for syncing file structure. Include a Message Queue notifying other online devices.'
  },
  {
    id: 'facebook-messenger',
    title: 'Real-time Chat App',
    description: 'Design a text-based instant messaging platform supporting direct messaging and history.',
    requirements: [
      'Facilitate seamless 1-on-1 conversations.',
      'Track and display user presence (online/offline).',
      'Store conversation history persistently.',
      'Deliver real-time message delivery with minimal lag.',
      'Keep message history strongly consistent across devices.',
    ],
    theory: 'Chat systems require full-duplex communication (WebSockets or Long Polling) for real-time delivery. Messages are stored persistently (HBase/Cassandra) using a sequence number per user for ordering.',
    components: ['Chat Servers (WebSocket)', 'Session/Presence Server', 'NoSQL Database (HBase/Cassandra)', 'Push Notification Service'],
    bottlenecks: ['Managing millions of concurrent open HTTP connections. The backend DB needs to handle super high write throughput. Presence service state changes (online/offline) cause huge fanout traffic.'],
    diagramHints: 'Show users connected to Chat Servers with persistent WebSockets. Chat Servers talk to a Presence DB and write to a massive NoSQL Database (HBase) concurrently. Use a Push Notification server for offline users.'
  },
  {
    id: 'twitter',
    title: 'Microblogging Service',
    description: 'Design a network where users broadcast short status updates, follow others, and view timelines.',
    requirements: [
      'Publish short text updates (sometimes with media).',
      'Follow other users\' timelines.',
      'Favorite/like specific posts.',
      'Generate a timeline of recent posts from followed accounts.',
      'Accommodate eventual consistency for timelines for the sake of availability.'
    ],
    theory: 'Twitter is heavily read-biased. It revolves around a publish/subscribe fanout model. When a user posts, it \'fans out\' to followers\' timelines. Due to huge celebrity followings, a hybrid approach (push for normal users, pull for celebrities) is often used.',
    components: ['Write/Post API servers', 'Read/Timeline API servers', 'Fanout Service (Message broker)', 'In-memory Cache (Redis)', 'Blob storage'],
    bottlenecks: ['Celebrity fanout (e.g., millions of followers) can cause extreme latency. Using mixed models (pulling celebrity tweets at read-time instead of pushing to all followers) fixes this.'],
    diagramHints: 'Draw standard users publishing to a Fanout Service which pushes updates to Redis caches of followers. Show celebrity tweets being kept in a separate global Cache and merged at read-time (hybrid fanout).'
  },
  {
    id: 'youtube',
    title: 'Video Streaming Platform',
    description: 'Design a video sharing site where users can upload, search, and stream videos.',
    requirements: [
      'Upload and host large video files.',
      'Discover videos by searching titles.',
      'Record engagement metrics (likes, dislikes, views).',
      'Provide a real-time, lag-free video streaming experience.',
      'Ensure zero video loss (high reliability).'
    ],
    theory: 'Video streaming involves video ingestion, encoding into multiple formats, and streaming distribution via Content Delivery Networks (CDN). Video ingestion uses block chunking to support resuming uploads.',
    components: ['Upload Servers', 'Encoding/Transcoding Service', 'CDN (Edge Servers)', 'Metadata DB', 'BigTable for Thumbnails'],
    bottlenecks: ['Serving videos directly from origin servers would crush bandwidth. CDNs solve this. Encoding videos synchronously slows down availability (use a Message Queue and background workers).'],
    diagramHints: 'Show Video Upload flow into a Processing Queue where Worker Nodes perform Encoding. Encoded videos are pushed to a CDN. Clients stream video directly from the Nearest CDN.'
  },
  {
    id: 'typeahead',
    title: 'Search Autocomplete',
    description: 'Design a real-time suggestion service predicting search queries as a user types.',
    requirements: [
      'Suggest top 10 relevant terms based on a typed prefix.',
      'Update suggestions dynamically in real-time.',
      'Maintain extreme low latency (under 200ms).',
      'Scale to thousands of queries per second.'
    ]
  },
  {
    id: 'api-rate-limiter',
    title: 'API Rate Limiter',
    description: 'Design an application-level throttle limiting requests per user or IP.',
    requirements: [
      'Cap the maximum requests an entity can perform within a time window.',
      'Operate securely in a horizontally scaled cluster of servers.',
      'Ensure fail-safe, highly available request validation.',
      'Impose negligible latency on the actual API request.'
    ],
  },
  {
    id: 'twitter-search',
    title: 'Microblog Search',
    description: 'Design a full-text search engine over billions of short text updates.',
    requirements: [
      'Index up to 400 million new updates daily.',
      'Process search queries using multiple keywords (AND/OR).',
      'Provide rapid search results over a massive distributed dataset.',
      'Manage high write loads while optimizing read latency.'
    ]
  },
  {
    id: 'web-crawler',
    title: 'Web Content Crawler',
    description: 'Design a bot that systematically crawls and indexes the World Wide Web.',
    requirements: [
      'Fetch and index hundreds of millions of web pages.',
      'Employ a scalable architecture to crawl concurrently.',
      'Maintain extensibility for future media types.',
      'Respect robots.txt and polite crawling speeds.'
    ]
  },
  {
    id: 'newsfeed',
    title: 'Social Newsfeed',
    description: 'Design a central feed containing updates from friends, pages, and groups.',
    requirements: [
      'Compile dynamic feeds from followed users and pages.',
      'Combine text, images, and video feeds homogeneously.',
      'Append new posts in real-time to active user feeds.',
      'Target maximum end-user latency of 2 seconds for feed generation.',
      'Rapid propagation of a new post to all followers.'
    ]
  },
  {
    id: 'nearby-friends',
    title: 'Location-Based Directory',
    description: 'Design a proximity service to discover restaurants and attractions.',
    requirements: [
      'Update and query places with geographical constraints.',
      'Find all relevant places within a given radius based on user coordinates.',
      'Support adding reviews and ratings to places.',
      'Handle a massive read-heavy search load.'
    ]
  },
  {
    id: 'uber',
    title: 'Ride-Hailing Backend',
    description: 'Design a real-time dispatch system connecting passengers to drivers.',
    requirements: [
      'Track realtime geolocations of thousands of drivers.',
      'Match passengers requesting rides to available nearby drivers.',
      'Track ride progress continuously until drop-off.',
      'Operate under strict real-time and scaling constraints.'
    ]
  },
  {
    id: 'ticketmaster',
    title: 'Ticket Booking System',
    description: 'Design an online ticketing platform for movies and events.',
    requirements: [
      'Browse cities, cinemas, movies, and showtimes.',
      'Provide seating maps and interactive seat selection.',
      'Lock seats temporarily during checkout.',
      'Ensure strict ACID compliance to prevent double-booking.',
      'Support high concurrency during blockbuster releases.'
    ]
  },
  {
    id: 'system-basics',
    title: 'System Design Basics',
    description: 'Core concepts for distributed scalable systems architectures.',
    requirements: [
      'Evaluate Scalability methods (Horizontal vs Vertical).',
      'Examine the CAP Theorem and eventual consistency tradeoffs.',
      'Implement Load Balancing approaches (Round Robin, Least Connection).',
      'Optimize performance with caching models (Write-Through, Write-Behind).',
      'Analyze Data Partitioning (Sharding) and Consistent Hashing paradigms.'
    ],
  },
];

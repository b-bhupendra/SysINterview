const fs = require('fs');

const caseStudies = [
    {
      "id": "url_shortener",
      "title": "Designing a URL Shortening service like TinyURL",
      "difficulty": "Easy",
      "key_topics": [
        "Capacity Estimation (100:1 read/write ratio)",
        "System APIs (createURL, deleteURL)",
        "Database Design (NoSQL)",
        "Base62 Encoding vs. Key Generation Service (KGS)",
        "Data Partitioning (Range-based vs. Hash-based)",
        "Caching (Memcache, LRU policy)"
      ]
    },
    {
      "id": "pastebin",
      "title": "Designing Pastebin",
      "difficulty": "Easy",
      "key_topics": [
        "Read-heavy systems (5:1 read/write ratio)",
        "Object storage for content (Amazon S3)",
        "Metadata database layer",
        "Key Generation Service (KGS)"
      ]
    },
    {
      "id": "instagram",
      "title": "Designing Instagram",
      "difficulty": "Medium",
      "key_topics": [
        "Separating Read and Write services",
        "Photo Metadata storage (Cassandra/Key-Value)",
        "Data Sharding (UserID vs. PhotoID)",
        "News Feed Generation (Pull vs. Push vs. Hybrid)",
        "Pre-generating News Feeds"
      ]
    },
    {
      "id": "dropbox",
      "title": "Designing Dropbox",
      "difficulty": "Medium",
      "key_topics": [
        "File chunking (4MB chunks)",
        "Synchronization Service",
        "Message Queuing Service (Request/Response queues)",
        "Data Deduplication (Post-process vs. In-line)",
        "Client architecture (Watcher, Chunker, Indexer, Internal DB)"
      ]
    },
    {
      "id": "facebook_messenger",
      "title": "Designing Facebook Messenger",
      "difficulty": "Medium",
      "key_topics": [
        "Push model using WebSockets / Long Polling",
        "Message Sequencing",
        "Wide-column database (HBase) for small updates",
        "Managing Online/Offline status efficiently"
      ]
    },
    {
      "id": "twitter",
      "title": "Designing Twitter",
      "difficulty": "Medium",
      "key_topics": [
        "Read-heavy traffic (100M uploads vs 28B views)",
        "Sharding by TweetID + Epoch timestamp",
        "Caching hot tweets (80-20 rule)",
        "Load Balancing"
      ]
    },
    {
      "id": "youtube_netflix",
      "title": "Designing Youtube or Netflix",
      "difficulty": "Medium",
      "key_topics": [
        "Processing Queue for Video Encoding",
        "Thumbnail storage (Bigtable)",
        "Content Delivery Networks (CDN)",
        "Video Deduplication"
      ]
    },
    {
      "id": "typeahead",
      "title": "Designing Typeahead Suggestion",
      "difficulty": "Medium",
      "key_topics": [
        "Trie Data Structure",
        "Storing top suggestions at each node",
        "Map-Reduce for frequency calculation",
        "Data Partitioning by hash/prefix"
      ]
    },
    {
      "id": "api_rate_limiter",
      "title": "Designing an API Rate Limiter",
      "difficulty": "Medium",
      "key_topics": [
        "Fixed Window vs. Rolling Window Algorithms",
        "Sliding Window with Counters (Redis Hash)",
        "IP vs. User based throttling"
      ]
    },
    {
      "id": "web_crawler",
      "title": "Designing a Web Crawler",
      "difficulty": "Hard",
      "key_topics": [
        "URL Frontier (Breadth-first search)",
        "Document Input Stream (DIS)",
        "Dedupe Tests (Checksums, Bloom Filters)",
        "Politeness constraints and robots.txt"
      ]
    },
    {
      "id": "facebook_newsfeed",
      "title": "Designing Facebook's Newsfeed",
      "difficulty": "Hard",
      "key_topics": [
        "Offline Generation for Newsfeed",
        "Fanout-on-write vs Fanout-on-load",
        "Feed Ranking algorithms"
      ]
    },
    {
      "id": "yelp",
      "title": "Designing Yelp or Nearby Friends",
      "difficulty": "Hard",
      "key_topics": [
        "Location-based search",
        "Proximity servers",
        "QuadTrees and Grids (implied)"
      ]
    }
  ];

fs.writeFileSync('src/app/knowledge-base.ts', \`export interface SystemDesignScenario {
  id: string;
  title: string;
  description: string;
  requirements: string[];

  theory?: string;
  components?: string[];
  bottlenecks?: string[];
  diagramHints?: string;
  
  difficulty?: string;
  key_topics?: string[];
}

export const SCENARIOS: SystemDesignScenario[] = \${JSON.stringify(caseStudies, null, 2)};
\`);

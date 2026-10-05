# Database Architecture Plan for OffHours

## Database Choice: PostgreSQL + Redis

### Why PostgreSQL?
- **ACID compliance** for critical user data
- **Geospatial support** (PostGIS) for location-based features
- **JSON support** for flexible user preferences
- **Strong consistency** for real-time features
- **Scalability** with read replicas and sharding

### Why Redis?
- **Real-time notifications** and WebSocket session management
- **Caching** for frequently accessed data
- **Rate limiting** for API security
- **Session storage** for authentication

## Schema Design

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  avatar VARCHAR(10) DEFAULT '🌟',
  location POINT NOT NULL, -- PostGIS point (lat, lng)
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  preferences JSONB NOT NULL DEFAULT '{}',
  presence_points INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  email_verified BOOLEAN DEFAULT false,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_tokens TEXT[], -- For push notifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_location ON users USING GIST (location);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_last_active ON users (last_active);
```

#### pods
```sql
CREATE TABLE pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  center_location POINT NOT NULL,
  radius_km DECIMAL(5,2) NOT NULL,
  chat_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pods_location ON pods USING GIST (center_location);
```

#### pod_members
```sql
CREATE TABLE pod_members (
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT false,
  PRIMARY KEY (pod_id, user_id)
);
```

#### activities
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  location_name VARCHAR(200),
  location_point POINT,
  reflection TEXT,
  points_earned INTEGER NOT NULL,
  nudge_id UUID,
  was_with_friends BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_user_id ON activities (user_id);
CREATE INDEX idx_activities_completed_at ON activities (completed_at);
CREATE INDEX idx_activities_location ON activities USING GIST (location_point);
```

#### nudges
```sql
CREATE TABLE nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  location_address TEXT NOT NULL,
  location_point POINT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  max_participants INTEGER,
  weather_condition VARCHAR(100),
  weather_temperature INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nudges_pod_id ON nudges (pod_id);
CREATE INDEX idx_nudges_scheduled_time ON nudges (scheduled_time);
CREATE INDEX idx_nudges_location ON nudges USING GIST (location_point);
```

#### nudge_participants
```sql
CREATE TABLE nudge_participants (
  nudge_id UUID REFERENCES nudges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'interested',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (nudge_id, user_id)
);
```

#### friendships
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships (requester_id);
CREATE INDEX idx_friendships_addressee ON friendships (addressee_id);
```

#### chat_rooms
```sql
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'pod', 'event', 'direct'
  name VARCHAR(200),
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room_id ON chat_messages (room_id, created_at);
```

## Scaling Strategy

### Current Capacity (MVP)
- **Users**: 10,000 concurrent users
- **Database**: Single PostgreSQL instance with read replicas
- **Real-time**: Redis for WebSocket sessions
- **File Storage**: AWS S3 for user avatars

### Scale to 100K Users
- **Database**: Master-slave PostgreSQL setup
- **Caching**: Redis cluster for session management
- **CDN**: CloudFlare for static assets
- **Load Balancer**: NGINX for API requests

### Scale to 1M+ Users
- **Database**: Sharded PostgreSQL by geographic region
- **Microservices**: Separate services for auth, notifications, chat
- **Message Queue**: RabbitMQ for async processing
- **Monitoring**: DataDog for performance monitoring

## Security Measures

### Data Protection
- **Encryption at rest**: PostgreSQL TDE
- **Encryption in transit**: TLS 1.3
- **Password hashing**: bcrypt with salt
- **API rate limiting**: Redis-based rate limiter
- **Input validation**: Parameterized queries, input sanitization

### Privacy
- **Location data**: Stored as approximate coordinates
- **Message encryption**: End-to-end for direct messages
- **Data retention**: Automatic cleanup of old data
- **GDPR compliance**: User data export/deletion

## Real-time Features

### WebSocket Architecture
- **Connection management**: Redis for session storage
- **Message routing**: By user ID and room ID
- **Presence tracking**: Real-time user status
- **Notification delivery**: Push notifications via FCM

### Notification Types
1. **Scheduled nudges**: Daily at user's preferred time
2. **Pod activities**: When friends join activities
3. **Friend requests**: Social connections
4. **System updates**: App announcements

## Performance Optimizations

### Database
- **Connection pooling**: PgBouncer
- **Query optimization**: Proper indexing
- **Caching**: Redis for frequently accessed data
- **Monitoring**: Query performance tracking

### API
- **Response caching**: Redis for API responses
- **Pagination**: Limit large data sets
- **Compression**: Gzip for API responses
- **CDN**: Static asset delivery

This architecture supports the current feature set and provides a clear path for scaling to millions of users while maintaining security and performance.
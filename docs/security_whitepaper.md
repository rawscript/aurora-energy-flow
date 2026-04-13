# Security Whitepaper

A deep dive into the encryption, telemetry protocols, and data isolation strategies powering Aurora's smart meter infrastructure.

The Aurora platform utilizes a zero-trust architecture designed specifically for the unique challenges of the Kenyan energy market. By combining AES-256 encryption at the edge with isolated cloud VPCs, we ensure that energy consumption data remains the property of the consumer.

- **Encryption**: AES-256
- **Protocol**: MQTTS
- **Isolation**: Multi-tenant
- **Auth**: JWT/OAuth2

## End-to-Edge Encryption
Data is encrypted at the source using hardware-accelerated AES-256. The encryption keys are generated within the Secure Element (SE) of the smart meter gateway, ensuring that raw telemetry data is never exposed in transit.
- Diffie-Hellman key exchange for secure handshake
- Automatic rotating session keys every 24 hours
- Hardware-level TLS 1.3 implementation

## Cloud Data Isolation
Our multi-tenant architecture uses Row-Level Security (RLS) and logical database isolation to ensure one customer's data can never be accessed by another, even within the same infrastructure cluster.
- **Stateless API Layers**: API requests are authenticated via short-lived JWTs with granular scope permissions.
- **Isolated VPCs**: Production data lives in a private subnet with no direct internet access.

## Access Control
All administrative access is logged, audited, and requires Multi-Factor Authentication (MFA). Our Security Operations Center (SOC) monitors for anomaly detection 24/7.

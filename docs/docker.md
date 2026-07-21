# Docker Guide

TTDash ships with a multi-stage Node Alpine image and a hardened Compose configuration. Docker mode is an explicit remote-bind mode: the process listens on `0.0.0.0` inside the container, disables browser auto-open, and requires a remote token of at least 24 characters.

## Localhost Quick Start

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
docker compose up --build -d
```

Open `http://127.0.0.1:3000` and enter the same token. Compose publishes to host loopback by default:

```text
127.0.0.1:3000 -> container 0.0.0.0:3000
```

Docker mode accepts `localhost`, `127.0.0.1`, and `::1` as default browser hosts when `TTDASH_TRUSTED_HOSTS` is unset. These Host-header checks do not change the listening interface or replace Docker publishing and firewall rules.

## What the Provided Service Enforces

The Compose service and image:

- run as the unprivileged `node` user
- use a read-only root filesystem
- drop all Linux capabilities
- set `no-new-privileges`
- mount `/tmp` as a small `noexec,nosuid` tmpfs
- use an init process
- persist `/data` in the `ttdash-data` volume
- restart unless explicitly stopped
- health-check `/api/runtime` with the configured token

The image sets:

```text
TTDASH_DOCKER=1
TTDASH_DATA_DIR=/data/data
TTDASH_CONFIG_DIR=/data/config
TTDASH_CACHE_DIR=/data/cache
```

Its command also passes `--docker`, so users of the provided image do not need to add the flag or environment variable themselves.

## Compose Variables

| Variable                 | Default                           | Purpose                                                                                    |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `TTDASH_REMOTE_TOKEN`    | required                          | Remote master token passed into the container; TTDash enforces at least 24 characters.     |
| `TTDASH_PUBLISH_ADDRESS` | `127.0.0.1`                       | Host-side address used in the Compose port mapping. This is not a TTDash runtime variable. |
| `TTDASH_TRUSTED_HOSTS`   | empty, activating Docker defaults | Exact comma-separated browser DNS names/IPs passed to TTDash.                              |
| `TTDASH_SECURE_COOKIE`   | `0`                               | Set to `1` for HTTPS-only browser session cookies.                                         |
| `TTDASH_TRUST_PROXY`     | `0`                               | Set to `1` only for a trusted sole-ingress proxy topology.                                 |

## Deployment Scenarios

### Host-local access only

Use the Compose defaults. Do not set `TTDASH_PUBLISH_ADDRESS`, `TTDASH_TRUSTED_HOSTS`, `TTDASH_SECURE_COOKIE`, or `TTDASH_TRUST_PROXY`.

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
docker compose up --build -d
```

### Trusted LAN or VPN address

Publish deliberately and trust the exact IP address or DNS name clients use:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
export TTDASH_PUBLISH_ADDRESS=0.0.0.0
export TTDASH_TRUSTED_HOSTS=192.0.2.10
docker compose up --build -d
```

Open `http://192.0.2.10:3000` only from a trusted LAN, VPN, or SSH tunnel. Multiple exact names/IPs are comma-separated:

```bash
export TTDASH_TRUSTED_HOSTS=dashboard.internal,192.0.2.10
```

Schemes, ports, paths, empty labels, and wildcards are rejected.

### Public DNS through HTTPS

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
export TTDASH_PUBLISH_ADDRESS=0.0.0.0
export TTDASH_TRUSTED_HOSTS=dashboard.example
export TTDASH_SECURE_COOKIE=1
export TTDASH_TRUST_PROXY=1
docker compose up --build -d
```

The reverse proxy must:

- be the container's only ingress
- terminate valid HTTPS
- preserve the original `Host: dashboard.example` header
- overwrite the forwarded client chain so the actual client IP is the last `X-Forwarded-For` entry
- avoid relying on `X-Forwarded-Host`, which TTDash intentionally ignores

Browser mutations require `Origin` and `Host` to agree. `TTDASH_SECURE_COOKIE=1` marks the remote session cookie as HTTPS-only. `TTDASH_TRUST_PROXY=1` affects only per-client authentication rate limits; without a restricted proxy topology, client-supplied forwarded addresses could weaken those limits.

Do not expose the service over public plaintext HTTP.

## Direct `docker run`

```bash
docker build --tag ttdash .
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"

docker run --rm \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --init \
  --publish 127.0.0.1:3000:3000 \
  --env TTDASH_REMOTE_TOKEN="$TTDASH_REMOTE_TOKEN" \
  --volume ttdash-data:/data \
  ttdash
```

For a server deployment, change the publish address and add the trusted-host/cookie/proxy variables described above. Preserve the hardening flags unless the surrounding platform provides equivalent controls.

## Data, Auto-Import, and PDF

- The `/data` volume stores usage, settings, local runtime state, and caches.
- JSON upload and backup import need no extra host mounts.
- Auto-import only sees usage sources and executables present inside the container. Mount required sources read-only and configure tools deliberately in a custom image.
- The standard image does not include Typst. Add Typst in a derived image if PDF export is required.
- Do not bake the remote token into an image. Inject it at runtime with an environment/secret mechanism appropriate to the deployment platform.

## Operations

Inspect service state and logs:

```bash
docker compose ps
docker compose logs --follow ttdash
```

Rebuild after source changes:

```bash
docker compose up --build -d
```

Stop containers while retaining the named data volume:

```bash
docker compose down
```

Removing the named volume deletes persisted TTDash state and is intentionally not part of the normal shutdown instructions.

Run the repository's real image smoke test with:

```bash
npm run test:docker
```

See the [configuration reference](configuration.md) for variable semantics, the [API reference](api.md) for token use, and [`SECURITY.md`](../SECURITY.md) for the security policy.

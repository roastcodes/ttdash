---
title: Docker
description: Run the hardened TTDash container locally or behind an authenticated HTTPS proxy.
---

TTDash ships with a multi-stage Node Alpine image and a hardened Compose service. Docker mode binds to `0.0.0.0` inside the container, disables browser auto-open, and requires a remote token of at least 24 characters.

## Localhost quick start

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
docker compose up --build -d
```

Open `http://127.0.0.1:3000` and enter the same token. Compose publishes only to host loopback by default:

```text
127.0.0.1:3000 -> container 0.0.0.0:3000
```

## Runtime hardening

The provided service and image:

- run as the unprivileged `node` user
- use a read-only root filesystem
- drop all Linux capabilities
- set `no-new-privileges`
- mount `/tmp` as a small `noexec,nosuid` tmpfs
- use an init process
- persist `/data` in the `ttdash-data` volume
- restart unless explicitly stopped
- health-check `/api/runtime` with authentication

The image configures:

```text
TTDASH_DOCKER=1
TTDASH_DATA_DIR=/data/data
TTDASH_CONFIG_DIR=/data/config
TTDASH_CACHE_DIR=/data/cache
```

## Compose variables

| Variable                 | Default                  | Purpose                                            |
| ------------------------ | ------------------------ | -------------------------------------------------- |
| `TTDASH_REMOTE_TOKEN`    | required                 | Remote master token passed into the container      |
| `TTDASH_PUBLISH_ADDRESS` | `127.0.0.1`              | Host-side address used by the Compose port mapping |
| `TTDASH_TRUSTED_HOSTS`   | Docker loopback defaults | Exact comma-separated browser DNS names/IPs        |
| `TTDASH_SECURE_COOKIE`   | `0`                      | Set to `1` for HTTPS-only browser cookies          |
| `TTDASH_TRUST_PROXY`     | `0`                      | Set to `1` only for a trusted sole-ingress proxy   |

`TTDASH_PUBLISH_ADDRESS` belongs to Compose and is not consumed by the TTDash process.

## Trusted LAN or VPN

Publish deliberately and trust the exact address clients use:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
export TTDASH_PUBLISH_ADDRESS=0.0.0.0
export TTDASH_TRUSTED_HOSTS=192.0.2.10
docker compose up --build -d
```

Use this only on a restricted LAN, VPN, or firewall policy. Host validation does not replace network controls.

## Public DNS behind HTTPS

When the reverse proxy is on the same host, keep the container port on loopback:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
export TTDASH_PUBLISH_ADDRESS=127.0.0.1
export TTDASH_TRUSTED_HOSTS=dashboard.example
export TTDASH_SECURE_COOKIE=1
export TTDASH_TRUST_PROXY=1
docker compose up --build -d
```

The proxy must be the only ingress, preserve the original host, terminate valid HTTPS, and overwrite forwarded client addresses. See [Remote access and security](/ttdash/deploying/remote-access/#public-https-through-a-reverse-proxy).

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

Preserve these hardening options unless the surrounding platform provides equivalent controls.

## Data, auto-import, and PDF

- `/data` stores usage, settings, local runtime state, and caches.
- JSON upload and backup import need no additional host mounts.
- Auto-import only sees sources and executables inside the container; mount sources read-only and add tooling deliberately.
- The standard image does not include Typst. Use a derived image when PDF export is required.
- Inject the remote token through an appropriate runtime secret mechanism; never store it in the image.

## Operations

```bash
docker compose ps
docker compose logs --follow ttdash
docker compose up --build -d
docker compose down
```

`docker compose down` retains the named volume. Removing that volume deletes persisted TTDash state and is intentionally not part of normal shutdown.

Contributors can verify the real image and Compose configuration with:

```bash
npm run test:docker
```

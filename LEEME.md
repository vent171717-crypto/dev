# DEV-IPTV con control de acceso (Cloudflare Workers)

## Despliegue

1. Instala dependencias y entra a tu cuenta:
   npm install
   npx wrangler login

2. Crea el almacén de equipos y copia el `id` que muestra en `wrangler.toml`:
   npx wrangler kv namespace create DISPOSITIVOS

3. Define la clave secreta (larga y aleatoria):
   npx wrangler secret put SECRET

4. Publica:
   npx wrangler deploy

## Autorizar / revocar equipos

Autorizar (el código lo ve el usuario en la pantalla "Equipo no autorizado"):
   npx wrangler kv key put --binding=DISPOSITIVOS --remote "CODIGO-DEL-EQUIPO" '{"nombre":"Sala","expira":"2026-12-31"}'

Revocar:
   npx wrangler kv key delete --binding=DISPOSITIVOS --remote "CODIGO-DEL-EQUIPO"

Listar:
   npx wrangler kv key list --binding=DISPOSITIVOS --remote

## Notas

- La URL de tu app debe apuntar a la raíz del Worker (https://dev-iptv.TU-USUARIO.workers.dev/).
- Los enlaces de video siguen siendo públicos si lo son en su origen: protégelos con enlaces firmados.
- Activa Rate Limiting en Seguridad > WAF para /api/auth.

# kendrick-sample-app

Sample Shopify app built for Weaverse onboarding Phase 1
([Weaverse/workspace#11](https://github.com/Weaverse/workspace/issues/11)).

The point is to learn the moving parts of a Shopify app — OAuth install, access
scopes, app config, tunnels, Admin API and theme app extensions — on something
small, before setting up Weaverse Studio locally in Phase 2.

Stack: React Router + TypeScript, Polaris web components, Prisma/SQLite for the
session store. Scaffolded with `shopify app init` (React Router template).

## Run it

```bash
npm install
shopify app dev --store <your-dev-store>.myshopify.com
```

The CLI opens a Cloudflare tunnel and prints a preview link.

## What it does

**OAuth install.** Installing from the preview link runs the standard flow:
install request → consent screen listing the requested scopes → redirect back to
the app → the access token is stored by Prisma in `prisma/dev.sqlite`, table
`Session`. The app is embedded, so the UI runs inside Shopify admin through App
Bridge.

**Admin API query and mutation** — `app/routes/app.products.tsx`

- The route **loader** runs a `products(first: 10)` query and renders the result
  in a table.
- Each row has its own `<fetcher.Form>`. Submitting it posts to the route's
  **action**, which runs a `productUpdate` mutation on that product.
- `userErrors` from the mutation are shown under the text field, so a rejected
  change says why instead of failing silently.

No component state is involved: the form carries the product id in a hidden
field, and the action reads both values with `request.formData()`.

**Theme app extension** — `extensions/sample-embed/blocks/app_embed.liquid`

An app embed block (`"target": "body"`) that injects a banner and a small script
into every storefront page. The merchant turns it on from *Theme editor → App
embeds*; no theme code is edited.

## Things that cost me time

**App names can't contain "Shopify".** `shopify app init --name shopify-sample-app`
fails with `App name cannot contain "Shopify"`. Only the app name is restricted,
not the repo name.

**`shopify.app.toml` is a local declaration, not the live config.** Editing the
file changes nothing until `shopify app deploy` pushes it. I spent hours on an
app that rendered `example.com` inside Shopify admin: the file said one thing
while the app registered on Shopify still pointed at its placeholder URL.
`deploy` pushes config and extensions; it does **not** deploy the server code.

**The tunnel hostname changes on every `shopify app dev` run.** Each restart
means editing `application_url` and `auth.redirect_urls`, then deploying again.
This is exactly why Phase 2 gives each developer a fixed Cloudflare hostname.

**`shopify app generate extension` scaffolds an app _block_, not an app embed.**
The generated demo uses `"target": "content"`, which the merchant drags into a
section. An app embed needs `"target": "head"` or `"body"` and appears under App
embeds instead.

**`target` decides where code is injected in the HTML, not where it appears on
screen.** `"body"` injects at the end of `<body>`; the banner sits at the top of
the viewport only because of `position: fixed` in its CSS.

**A shell keeps its directory, not its name.** After renaming a folder with
`mv`, an already-open terminal is still inside the renamed directory — so
`shopify app dev` there runs the wrong project, with output that looks entirely
normal. `shopify app info` prints the app name and root location; worth checking
before every run.

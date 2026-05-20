# MongoDB Schema — image-dash

Database name is configured via `DATABASE_NAME` env var.  
This project uses 6 collections. Collection names come from env vars where noted; fallback defaults are shown.

---

## 1. `users` (env: `COLLECTION_Loggin`)

Authentication store. Plain-text password comparison (trimmed).

| Field      | Type     | Notes                                  |
| ---------- | -------- | -------------------------------------- |
| `_id`      | ObjectId |                                        |
| `username` | string   | optional                               |
| `email`    | string   | optional                               |
| `password` | string   | plain text, trimmed for comparison     |

**Lookup patterns:**
- Login searches by `username` / `email` first, then by exact `password` match as fallback.

---

## 2. `all_images` (env: `COLLECTION_ALL_IMAGES`, default: `all_images`)

Central image catalog. Three subtypes via the `type` field.

### Common fields (all types)

| Field         | Type           | Notes                                         |
| ------------- | -------------- | --------------------------------------------- |
| `_id`         | ObjectId       |                                               |
| `type`        | string         | `"browse"`, `"crawled"`, or `"evaluation"`    |
| `importedAt`  | Date           | when the image was first imported             |
| `lastSynced`  | Date           | updated by `/api/images/sync`                 |

### type = `"browse"`

Imported from a CSV of crawled site images (file upload via PapaParse).

| Field          | Type           | Notes                                          |
| -------------- | -------------- | ---------------------------------------------- |
| `url`          | string         | **unique key** for upserts                     |
| `contentType`  | string         | MIME type (e.g. `image/jpeg`)                  |
| `size`         | number         | bytes                                          |
| `inlinks`      | string         | raw inlink count from crawl CSV                |
| `indexability` | string         | from crawl CSV                                 |
| `dimensions`   | object\|null   | `{ width: number, height: number, text: string }` |
| `altText`      | string\|null   | set during sync                                |
| `asset_url`    | string\|null   | set during sync                                |

### type = `"crawled"`

Inserted by the n8n crawler webhook (Jina + GPT-4.1-mini classification pipeline).  
Also get the `source_page` field used by the inlinks aggregator.

| Field            | Type         | Notes                                           |
| ---------------- | ------------ | ----------------------------------------------- |
| `url`            | string       | image URL                                       |
| `source_page`    | string       | the landing page URL this image was found on    |
| `category`       | string       | one of: `hero`, `product`, `case-study`, `person`, `logo`, `partner-logo`, `icon`, `illustration`, `screenshot`, `background`, `unknown` |
| `desc`           | string\|null | GPT-generated description                       |
| `keywords`       | string\|null | JSON array of keyword strings (stored as JSON string from crawl, parsed at display) |
| `altText`        | string\|null |                                                  |
| `layout`         | string\|null |                                                  |
| `color_palette`  | string\|null |                                                  |
| `tone_and_feeling`| string\|null |                                                 |
| `visual_style`   | string\|null |                                                  |
| `branding`       | string\|null |                                                  |

### type = `"evaluation"`

Imported from a CSV of ad asset evaluations. Re-importing deletes all existing evaluation rows first (full replacement).

| Field            | Type   | Notes                                                |
| ---------------- | ------ | ---------------------------------------------------- |
| `asset_url`      | string | part of **composite key** with `field_type`          |
| `field_type`     | string | part of **composite key** with `asset_url`           |
| `campaign_name`  | string |                                                      |
| `asset_group_name`| string |                                                     |
| `asset_id`       | string |                                                      |
| `asset_type`     | string |                                                      |
| `desc`           | string | human-written evaluation description                  |
| `keywords`       | string | JSON array of keyword strings                         |
| `layout`         | string |                                                      |
| `color_palette`  | string |                                                      |
| `tone_and_feeling`| string |                                                     |
| `visual_style`   | string |                                                      |
| `branding`       | string |                                                      |
| `status`         | string | evaluation status                                    |

**Upsert key:** `(asset_url, field_type)` — same image in different campaigns is stored once per field type.

---

## 3. `image_selections` (env: `COLLECTION_IMAGES`)

User-curated collections of images, grouped into labeled buckets. These are what users "save" from the dashboard.

| Field                  | Type     | Notes                                          |
| ---------------------- | -------- | ---------------------------------------------- |
| `_id`                  | ObjectId |                                                |
| `name`                 | string   | collection name                                |
| `groups`               | array    | array of group objects (see below)             |
| `totalImages`          | number   | sum of all images across all groups            |
| `customerId`           | string\|null |                                             |
| `createdByUsername`    | string\|null |                                            |
| `createdByUserId`      | string\|null |                                            |
| `createdByLabel`       | string\|null | display label of creator                  |
| `createdAt`            | Date     |                                                |
| `updatedAt`            | Date     |                                                |
| `lastUpdatedByUsername`| string\|null |                                            |
| `lastUpdatedByUserId`  | string\|null |                                            |
| `lastUpdatedByLabel`   | string\|null |                                            |

### Group object (inside `groups[]`)

| Field    | Type   | Notes                        |
| -------- | ------ | ---------------------------- |
| `label`  | string | group name (e.g. "Hero")    |
| `images` | array  | array of image objects       |

### Image object (inside `groups[].images[]`)

Images copied in from `all_images`, augmented with attribution:

| Field            | Type         | Notes                                    |
| ---------------- | ------------ | ---------------------------------------- |
| `url`            | string\|null | from browse/crawled images               |
| `asset_url`      | string\|null | from evaluation images                   |
| *(all original fields)* |        | the full source image is copied in       |
| `addedByLabel`   | string\|null | who added this image to the collection   |
| `addedByUsername`| string\|null |                                          |
| `addedByUserId`  | string\|null |                                          |
| `addedAt`        | Date         | when added to the collection             |

**Key uniqueness within a group:** images are deduplicated by `url || asset_url`.

---

## 4. `image_page_links` (env: `COLLECTION_IMAGE_PAGE_LINKS`, default: `image_page_links`)

Scraped image-to-page associations. Imported from a "Type: Image" CSV of internal links.

| Field        | Type   | Notes                                      |
| ------------ | ------ | ------------------------------------------ |
| `_id`        | ObjectId |                                          |
| `pageUrl`    | string | the page the image appears on              |
| `imageUrl`   | string | the image URL                              |
| `altText`    | string | from crawl                                 |
| `size`       | number | bytes                                      |
| `importedAt` | Date   |                                            |

**Upsert key:** `(pageUrl, imageUrl)`

**Query patterns:**
- `/api/images/crawl?pageUrl=X` counts images by `pageUrl` (checks with/without trailing slash).
- `/api/images/inlinks` groups all rows by `pageUrl` to build the landing page view.

---

## 5. `page_image_assignments` (hardcoded)

User-assigned images to landing pages. Each document holds the complete image list for one page URL.

| Field       | Type   | Notes                                              |
| ----------- | ------ | -------------------------------------------------- |
| `_id`       | ObjectId |                                                  |
| `pageUrl`   | string | **unique key** for upserts                         |
| `images`    | array  | array of image objects copied from `all_images`     |
| `updatedAt` | Date   |                                                    |

### Image object (inside `images[]`)

Same shape as the source image from `all_images`, plus attribution:

| Field            | Type         | Notes                                  |
| ---------------- | ------------ | -------------------------------------- |
| `url`            | string\|null |                                        |
| `asset_url`      | string\|null |                                        |
| *(all original fields)* |        | copied from source                     |
| `addedByLabel`   | string\|null |                                        |
| `addedByUsername`| string\|null |                                        |
| `addedByUserId`  | string\|null |                                        |
| `addedAt`        | Date         |                                        |

**Attribution behavior:** if an image already has `addedByLabel`/`addedByUsername` from a previous assignment, that attribution is preserved. Otherwise the current logged-in user is stamped via JWT.

---

## 6. `manual_landing_pages` (hardcoded)

Landing page URLs manually added by users (not from scraped CSV data).

| Field            | Type   | Notes                                |
| ---------------- | ------ | ------------------------------------ |
| `_id`            | ObjectId |                                    |
| `pageUrl`        | string |                                     |
| `addedByLabel`   | string | display label of user who added it   |
| `addedByUsername`| string\|null |                                |
| `addedByUserId`  | string\|null |                                |
| `addedAt`        | Date   |                                     |

**Query patterns:** checked on add to prevent duplicates (with/without trailing slash variants).

---

## Cross-collection relationships

```
users ──(no FK)──> image_selections (createdByUserId, customerId)
                  page_image_assignments (addedByUserId)
                  manual_landing_pages (addedByUserId)

all_images ──(copied by value)──> image_selections.groups[].images[]
                                  page_image_assignments.images[]

image_page_links ──(grouped by pageUrl)──> landing page view (inlinks)

manual_landing_pages ──(merged by pageUrl)──> landing page view (inlinks)
```

There are no foreign key constraints. User references are stored as `userId` strings (the `_id.toString()` of a `users` document). Images are copied by value into collections and assignments — not referenced by ID.

---

## Environment variables

| Variable                     | Default               | Collection              |
| ---------------------------- | --------------------- | ----------------------- |
| `DATABASE_URL`               | (required)            | —                       |
| `DATABASE_NAME`              | (required)            | —                       |
| `COLLECTION_Loggin`          | —                     | `users`                 |
| `COLLECTION_ALL_IMAGES`      | —                     | `all_images`            |
| `COLLECTION_IMAGES`          | —                     | `image_selections`      |
| `COLLECTION_IMAGE_PAGE_LINKS`| `image_page_links`    | `image_page_links`      |
| `JWT_SECRET`                 | (required)            | —                       |
| `N8N_WEBHOOK_URL`            | —                     | —                       |

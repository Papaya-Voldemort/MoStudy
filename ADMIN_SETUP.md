# Admin setup

MoStudy stores custom tests in Appwrite Database (`tests` collection).

## 1) Create collection

Create a `tests` collection in database `mostudy` with attributes:

- `test_id` (string, 100, required)
- `test_data` (string, 1,000,000, required)

Permissions:

- Read: `any`
- Create/Update/Delete: `label("admin")`

## 2) Grant admin label

Add the `admin` label to the user that should access `/admin`.

## 3) Open the dashboard

Visit `/admin` and create tests.

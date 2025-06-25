import {StorageClient} from "@supabase/storage-js"

const storageClient = new StorageClient(
    process.env.NEXT_PUBLIC_STORAGE_URL as string,
    {
        apikey : process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string,
        Authorization : `Bearer ${process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string}`
    }
)

export default storageClient
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { getAuth } from "firebase/auth";

export function uploadUserVideo(file: File) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const storage = getStorage();
  const path = `users/${uid}/videos/${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  const metadata = { contentType: file.type };

  return new Promise((resolve, reject) => {
    const t = uploadBytesResumable(r, file, metadata);
    t.on('state_changed',
      s => console.log(`Upload is ${Math.round(100*s.bytesTransferred/s.totalBytes)}% done`),
      reject,
      () => resolve(path)
    );
  });
}

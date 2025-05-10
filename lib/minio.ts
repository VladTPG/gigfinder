/**
 * Client-side utility to upload files to Minio via API route
 * @param file The file to upload
 * @param path The path where the file should be stored
 * @returns Promise resolving to the download URL
 */
export const uploadFileToMinio = async (
  file: File,
  path: string
): Promise<string> => {
  try {
    console.log(
      `Preparing to upload file: name=${file.name}, size=${file.size}, type=${file.type}, path=${path}`
    );

    // Create form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    console.log(`Sending file to API route: /api/upload`);

    // Upload via API route
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    console.log(`API response status: ${response.status}`);

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`Upload API error: ${JSON.stringify(responseData)}`);
      throw new Error(
        responseData.error || `Server returned ${response.status}`
      );
    }

    console.log(
      `File uploaded successfully to ${path}, URL: ${responseData.url}`
    );
    return responseData.url;
  } catch (error) {
    console.error("Error uploading file to Minio:", error);
    throw new Error(
      `Failed to upload file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

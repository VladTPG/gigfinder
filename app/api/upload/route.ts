import { NextRequest, NextResponse } from "next/server";
import * as Minio from "minio";

// Configure Minio client (server-side only)
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
});

// The bucket where files will be stored
const BUCKET_NAME = process.env.MINIO_BUCKET || "gigfinder";

export async function POST(request: NextRequest) {
  try {
    // Log configuration without sensitive details
    console.log(
      `Minio config: endpoint=${process.env.MINIO_ENDPOINT}, port=${process.env.MINIO_PORT}, useSSL=${process.env.MINIO_USE_SSL}, bucket=${BUCKET_NAME}`
    );

    // Test Minio connection first
    try {
      await minioClient.listBuckets();
    } catch (connectionError) {
      console.error("Failed to connect to Minio server:", connectionError);
      return NextResponse.json(
        {
          error: "Failed to connect to storage server",
          details:
            connectionError instanceof Error
              ? connectionError.message
              : String(connectionError),
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: "File or path is missing" },
        { status: 400 }
      );
    }

    console.log(
      `Received file: name=${file.name}, size=${file.size}, type=${file.type}, path=${path}`
    );

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`File converted to buffer, size=${buffer.length}`);

    // Check if bucket exists
    let bucketExists = false;
    try {
      bucketExists = await minioClient.bucketExists(BUCKET_NAME);
      console.log(`Bucket check: ${BUCKET_NAME} exists = ${bucketExists}`);
    } catch (bucketCheckError) {
      console.error(`Error checking if bucket exists:`, bucketCheckError);
      return NextResponse.json(
        {
          error: "Failed to check if storage bucket exists",
          details:
            bucketCheckError instanceof Error
              ? bucketCheckError.message
              : String(bucketCheckError),
        },
        { status: 500 }
      );
    }

    // Create bucket if it doesn't exist
    if (!bucketExists) {
      try {
        console.log(`Creating bucket ${BUCKET_NAME}`);
        await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
        console.log(`Bucket ${BUCKET_NAME} created successfully`);
      } catch (bucketCreateError) {
        console.error(`Error creating bucket:`, bucketCreateError);
        return NextResponse.json(
          {
            error: "Failed to create storage bucket",
            details:
              bucketCreateError instanceof Error
                ? bucketCreateError.message
                : String(bucketCreateError),
          },
          { status: 500 }
        );
      }
    }

    // Upload to Minio
    try {
      console.log(`Uploading to Minio: bucket=${BUCKET_NAME}, path=${path}`);
      await minioClient.putObject(BUCKET_NAME, path, buffer, buffer.length, {
        "Content-Type": file.type,
      });
      console.log(`Upload to Minio successful`);
    } catch (uploadError) {
      console.error(`Minio upload error:`, uploadError);
      return NextResponse.json(
        {
          error: "Failed to upload file to storage",
          details:
            uploadError instanceof Error
              ? uploadError.message
              : String(uploadError),
        },
        { status: 500 }
      );
    }

    // Generate the URL for the uploaded object
    const baseUrl =
      process.env.MINIO_PUBLIC_URL ||
      `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${
        process.env.MINIO_ENDPOINT
      }:${process.env.MINIO_PORT}`;

    const downloadUrl = `${baseUrl}/${BUCKET_NAME}/${path}`;
    console.log(`Generated download URL: ${downloadUrl}`);

    return NextResponse.json({ url: downloadUrl });
  } catch (error) {
    console.error("Error in upload API route:", error);
    return NextResponse.json(
      {
        error: `Upload failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

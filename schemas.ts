import * as coda from "@codahq/packs-sdk";
import { type } from "os";

export const ProjectSchema = coda.makeObjectSchema({
    properties: {
        projectId: {
            type: coda.ValueType.String,
            required: true,
        },
        name: {
            type: coda.ValueType.String,
            required: true,
        },
        teamId: {
            description: "ID of the team the project belongs to",
            type: coda.ValueType.String,
        },
        url: {
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.Url,
        },
        fileCount: {
            type: coda.ValueType.Number,
        },
        folderCount: {
            type: coda.ValueType.Number,
        },
        createdAt: {
            description: "Date the project was created",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.DateTime,
        },
        updatedAt: {
            description: "Date the project was updated",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.DateTime,
        },
        rootAssetId: {
            description:
                "ID of the root asset (all assets are nested under this virtual one)",
            type: coda.ValueType.String,
        },
    },
    displayProperty: "name",
    idProperty: "projectId",
    featuredProperties: ["url", "fileCount"],
});

export const ProjectReferenceSchema = coda.makeReferenceSchemaFromObjectSchema(
    ProjectSchema,
    "Project"
);

const AssetReferenceSchema = coda.makeObjectSchema({
    codaType: coda.ValueHintType.Reference,
    properties: {
        name: { type: coda.ValueType.String, required: true },
        assetId: { type: coda.ValueType.String, required: true },
    },
    displayProperty: "name",
    idProperty: "assetId",
    identity: {
        name: "Asset",
    },
});

export const AssetSchema = coda.makeObjectSchema({
    properties: {
        assetId: {
            description: "ID of the asset/video",
            type: coda.ValueType.String,
        },
        name: {
            description: "Name of the asset/video",
            type: coda.ValueType.String,
        },
        type: {
            description: "Folder or file",
            type: coda.ValueType.String,
        },
        thumb: {
            description: "Thumbnail of the asset",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.ImageAttachment,
        },
        parent: AssetReferenceSchema,
        commentCount: {
            description: "Number of comments on the asset",
            type: coda.ValueType.Number,
        },
        itemCount: {
            description: "Number of items inside the asset",
            type: coda.ValueType.Number,
        },
        createdAt: {
            description: "Date the asset was created/uploaded",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.DateTime,
        },
        updatedAt: {
            description: "Date the asset was updated",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.DateTime,
        },
        isInProjectRoot: {
            description:
                "Whether the asset lives loose in the root level of the project",
            type: coda.ValueType.Boolean,
        },
        fps: {
            description: "Frame rate (frames per second)",
            type: coda.ValueType.Number,
        },
    },
    displayProperty: "name",
    idProperty: "assetId",
    featuredProperties: ["thumb", "type", "commentCount"],
});

export const ReviewLinkSchema = coda.makeObjectSchema({
    properties: {
        name: {
            description: "Name of the review link",
            type: coda.ValueType.String,
            required: true,
        },
        url: {
            description: "URL of the review link",
            type: coda.ValueType.String,
            //   fromKey: "short_url",
        },
        reviewLinkId: {
            description: "ID of the review link",
            type: coda.ValueType.String,
            required: true,
            //   fromKey: "id",
        },
        projectId: {
            description: "ID of the project this review link is part of",
            type: coda.ValueType.String,
            //   fromKey: "project_id",
        },
        createdAt: {
            description: "Date the review link was created",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.DateTime,
            //   fromKey: "inserted_at",
        },
        viewCount: {
            description: "Number of views for the review link",
            type: coda.ValueType.Number,
            //   fromKey: "view_count",
        },
        assets: {
            description: "Assets in the review link",
            type: coda.ValueType.Array,
            items: AssetReferenceSchema,
        },
    },
    displayProperty: "name",
    idProperty: "reviewLinkId",
    featuredProperties: ["url", "createdAt", "viewCount"],
});

export const ReviewLinkReferenceSchema =
    coda.makeReferenceSchemaFromObjectSchema(ReviewLinkSchema, "ReviewLink");

const CommentReferenceSchema = coda.makeObjectSchema({
    codaType: coda.ValueHintType.Reference,
    properties: {
        text: { type: coda.ValueType.String, required: true },
        commentId: { type: coda.ValueType.String, required: true },
    },
    displayProperty: "text",
    idProperty: "commentId",
    identity: {
        name: "Comment",
    },
});

export const CommentSchema = coda.makeObjectSchema({
    properties: {
        commentId: {
            description: "ID of the comment",
            type: coda.ValueType.String,
            required: true,
        },
        text: {
            description: "Text of the comment",
            type: coda.ValueType.String,
            required: true,
        },
        timecode: {
            description: "Timecode of the comment in MM:SS format",
            type: coda.ValueType.String,
        },
        timecodeSeconds: {
            description: "Timecode of the comment in seconds",
            type: coda.ValueType.Number,
        },
        createdAt: {
            description: "Date the comment was created",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.DateTime,
        },
        updatedAt: {
            description: "Date the comment was updated",
            type: coda.ValueType.String,
            codaType: coda.ValueHintType.DateTime,
        },
        assetId: {
            description: "ID of the asset this comment was left on",
            type: coda.ValueType.String,
        },
        asset: AssetReferenceSchema,
        leftByEmail: {
            description: "Email address of the user who left the comment",
            type: coda.ValueType.String,
        },
        leftBy: {
            description: "User who left the comment",
            type: coda.ValueType.String,
        },
        replyingTo: CommentReferenceSchema,
        isAReply: {
            description: "Whether this comment is a reply to another comment",
            type: coda.ValueType.Boolean,
        },
        hasReplies: {
            description: "Whether this comment has replies",
            type: coda.ValueType.Boolean,
        },
        replies: {
            description: "The replies to this comment",
            type: coda.ValueType.Array,
            items: CommentReferenceSchema,
        },
        completed: {
            description: "Whether this comment has been marked as completed",
            type: coda.ValueType.Boolean,
        },
    },
    displayProperty: "text",
    idProperty: "commentId",
    featuredProperties: ["asset", "createdAt", "leftBy"],
});

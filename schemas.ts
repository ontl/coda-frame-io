import * as coda from "@codahq/packs-sdk";

export const ProjectSchema = coda.makeObjectSchema({
  properties: {
    projectId: {
      description: "ID of the project",
      type: coda.ValueType.String,
      required: true,
    },
    name: {
      description: "Name of the project",
      type: coda.ValueType.String,
      required: true,
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
      description: "ID of the root asset of the project",
      type: coda.ValueType.String,
    },
  },
  displayProperty: "name",
  idProperty: "projectId",
});

export const ProjectReferenceSchema = coda.makeReferenceSchemaFromObjectSchema(
  ProjectSchema,
  "Project"
);

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
  },
  displayProperty: "name",
  idProperty: "reviewLinkId",
  featuredProperties: ["url", "createdAt", "viewCount"],
});

export const ReviewLinkReferenceSchema =
  coda.makeReferenceSchemaFromObjectSchema(ReviewLinkSchema, "ReviewLink");

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
  },
  displayProperty: "name",
  idProperty: "assetId",
  featuredProperties: ["thumb", "type", "commentCount"],
});

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
    inReplyTo: CommentReferenceSchema,
    hasReplies: {
      description: "Whether this comment has replies",
      type: coda.ValueType.Boolean,
    },
    replies: {
      description: "Replies to this comment",
      type: coda.ValueType.Array,
      items: CommentReferenceSchema,
    },
  },
  displayProperty: "text",
  idProperty: "commentId",
  featuredProperties: ["asset", "createdAt", "leftBy"],
});

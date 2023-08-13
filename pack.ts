import * as coda from "@codahq/packs-sdk";
import * as constants from "./constants";
import * as schemas from "./schemas";
import * as formulas from "./formulas";

export const pack = coda.newPack();

// Set up oAuth for frame.io
pack.addNetworkDomain("frame.io");
pack.setUserAuthentication({
    type: coda.AuthenticationType.OAuth2,
    authorizationUrl: "https://applications.frame.io/oauth2/auth",
    tokenUrl: "https://applications.frame.io/oauth2/token",
    scopes: [
        "offline",
        "comment.read",
        "team.read",
        "comment.delete",
        "account.read",
        "asset.create",
        "reviewlink.read",
        "asset.read",
        "comment.create",
        "reviewlink.update",
        "reviewlink.delete",
        "asset.delete",
        "team.create",
        "team.update",
        "reviewlink.create",
        "asset.update",
        "comment.update",
        "project.delete",
        "project.create",
        "project.read",
        "project.update",
    ],
    // Set the connection name to match the account name at frame.io
    getConnectionName: async function (context) {
        let response = await context.fetcher.fetch({
            method: "GET",
            url: constants.BASE_URL + "/me",
        });
        return response.body.email;
    },
});

// Add a sync table to fetch all projects (optionally, for a single team)
pack.addSyncTable({
    name: "Projects",
    schema: schemas.ProjectSchema,
    identityName: "Project",
    formula: {
        name: "SyncProjects",
        description:
            "Sync all projects for a team, or all the projects you have access to",
        parameters: [
            coda.makeParameter({
                type: coda.ParameterType.String,
                name: "teamId",
                description:
                    "ID of a team, if you only want one team's projects",
                optional: true,
            }),
        ],
        execute: async function ([teamId], context) {
            return await formulas.syncProjects(context, teamId);
        },
    },
});

// Add a sync table to fetch all review links for a project
pack.addSyncTable({
    name: "ReviewLinks",
    schema: schemas.ReviewLinkSchema,
    identityName: "ReviewLink",
    formula: {
        name: "SyncReviewLinks",
        description: "Sync all review links for a project",
        parameters: [
            coda.makeParameter({
                // TODO: Make this optionally an ID or URL parameter that we parse
                type: coda.ParameterType.String,
                name: "projectId",
                description: "ID of the project to get review links for",
                // TODO: Add autocomplete; trouble is we need to know which account they want to fetch from (...all of them?)
            }),
        ],
        execute: async function ([projectId], context) {
            return await formulas.syncReviewLinks(context, projectId);
        },
    },
});

// Add a sync table to fetch all assets for a project
pack.addSyncTable({
    name: "Assets",
    schema: schemas.AssetSchema,
    identityName: "Asset",
    formula: {
        name: "SyncAssets",
        description: "Sync all assets for a project",
        parameters: [
            coda.makeParameter({
                type: coda.ParameterType.String,
                name: "projectId",
                description: "ID of the project to get assets for",
            }),
        ],
        execute: async function ([projectId], context) {
            return await formulas.syncProjectAssets(context, projectId);
        },
    },
});

// Add a sync table to fetch all comments in a project
pack.addSyncTable({
    name: "ProjectComments",
    schema: schemas.CommentSchema,
    identityName: "Comment",
    formula: {
        name: "SyncProjectComments",
        description: "Sync comments for all assets in a project",
        parameters: [
            coda.makeParameter({
                type: coda.ParameterType.String,
                name: "projectId",
                description: "ID of the project to get comments for",
            }),
        ],
        execute: async function ([projectId], context) {
            return await formulas.syncProjectComments(context, projectId);
        },
    },
});

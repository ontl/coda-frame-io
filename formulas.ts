import * as coda from "@codahq/packs-sdk";
import * as constants from "./constants";
import * as helpers from "./helpers";

/* -------------------------------------------------------------------------- */
/*                                  PROJECTS                                  */
/* -------------------------------------------------------------------------- */

export async function syncProjects(
    context: coda.SyncExecutionContext,
    teamId?: string
) {
    // We can only get projects for a single team, so if we don't have a team to
    // work with, we're going to fetch all teams and then fetch all projects for
    // them.
    let teamIds = [];
    if (teamId) {
        teamIds.push(teamId);
    } else {
        let response = await context.fetcher.fetch({
            method: "GET",
            url: constants.BASE_URL + "/teams",
        });
        teamIds = response.body.map((team) => team.id);
    }

    let projects = [];
    for (let teamId of teamIds) {
        // The safer way to do this would be with continuations. But because
        // we're potentially doing multiple teamIds, it gets really complicated to
        // manage the pagination, so instead we're just going to take advantage
        // of the fact that frame.io will send us apparently unlimited number of
        // results, if we want.
        let url = coda.withQueryParams(
            constants.BASE_URL + "/teams/" + teamId + "/projects",
            { per_page: 9999 }
        );
        let teamProjectsResponse = await context.fetcher.fetch({
            method: "GET",
            url: url,
        });
        for (let project of teamProjectsResponse.body) {
            projects.push({
                name: project.name,
                projectId: project.id,
                teamId: teamId,
                rootAssetId: project.root_asset_id,
                createdAt: project.inserted_at,
                updatedAt: project.updated_at,
            });
        }
    }

    return { result: projects };
}

/* -------------------------------------------------------------------------- */
/*                                REVIEW LINKS                                */
/* -------------------------------------------------------------------------- */

export async function syncReviewLinks(
    context: coda.SyncExecutionContext,
    projectId: string
) {
    let response = await context.fetcher.fetch({
        method: "GET",
        url: constants.BASE_URL + "/projects/" + projectId + "/review_links",
    });

    let result = [];

    for (let reviewLink of response.body) {
        let assets = [];
        for (let asset of reviewLink.items) {
            assets.push({
                assetId: asset.asset_id,
                name: "Not found",
            });
        }
        result.push({
            name: reviewLink.name,
            url: reviewLink.short_url,
            reviewLinkId: reviewLink.id,
            projectId: reviewLink.project_id,
            createdAt: reviewLink.inserted_at,
            viewCount: reviewLink.view_count,
            assets: assets,
        });
    }

    return { result: result };
}

/* -------------------------------------------------------------------------- */
/*                                   ASSETS                                   */
/* -------------------------------------------------------------------------- */

async function getAssetChildren(
    context: coda.SyncExecutionContext,
    assetId: string
) {
    let assetResponse = await context.fetcher.fetch({
        method: "GET",
        url: constants.BASE_URL + "/assets/" + assetId + "/children",
    });

    let result = [];

    for (let asset of assetResponse.body) {
        let isInProjectRoot = asset.parent_id === asset.project.root_asset_id;
        let parent;
        if (isInProjectRoot) {
            parent = {
                name: "Project Root",
                assetId: asset.project.root_asset_id,
            };
        } else {
            parent = {
                name: "Not found", // this is just a placeholder; it'll probably be found and populate
                assetId: asset.parent_id,
            };
        }

        result.push({
            name: asset.name,
            assetId: asset.id,
            type:
                asset._type === "version_stack" ? "version stack" : asset._type,
            thumb: asset.thumb,
            parent: parent,
            commentCount: asset.comment_count,
            itemCount: asset.item_count,
            createdAt: asset.inserted_at,
            updatedAt: asset.updated_at,
            isInProjectRoot: isInProjectRoot,
            fps: asset.fps,
        });
    }

    return result;
}

async function getAssetsInProject(
    context: coda.SyncExecutionContext,
    projectId: string
) {
    // GET projects/:project_id, to determine its root asset
    let projectResponse = await context.fetcher.fetch({
        method: "GET",
        url: constants.BASE_URL + "/projects/" + projectId,
    });
    let rootAssetId = projectResponse.body.root_asset_id;
    console.log("Root asset ID: " + rootAssetId);

    // get the top-level assets
    let result = await getAssetChildren(context, rootAssetId);

    // get any of their child assets, recursively
    // filter out any assets that have no children
    let containers = result.filter((asset) => asset.itemCount > 0);
    while (containers.length > 0) {
        let containerResults = [];
        let containersToFetch = containers;
        // TODO: Parallelize this
        for (let container of containersToFetch) {
            let containerResult = await getAssetChildren(
                context,
                container.assetId
            );
            containerResults.push(containerResult);
        }
        // add the elements of containerResults to result
        result = result.concat(...containerResults);
        // reassign containers to be any of these new assets that have children
        containers = containerResults.filter((asset) => asset.itemCount > 0);
    }

    return result;
}

export async function syncProjectAssets(
    context: coda.SyncExecutionContext,
    projectId: string
) {
    let result = await getAssetsInProject(context, projectId);
    return { result: result };
}

/* -------------------------------------------------------------------------- */
/*                                  COMMENTS                                  */
/* -------------------------------------------------------------------------- */
export async function syncProjectComments(
    context: coda.SyncExecutionContext,
    projectId: string
) {
    let assets = await getAssetsInProject(context, projectId);
    // Trim to assets that have comments
    assets = assets.filter((asset) => asset.commentCount > 0);
    let commentsResult = [];
    // TODO: Parallelize this
    for (let asset of assets) {
        let commentResponse = await context.fetcher.fetch({
            method: "GET",
            url: constants.BASE_URL + "/assets/" + asset.assetId + "/comments",
        });
        for (let comment of commentResponse.body) {
            let timecodeSeconds = comment.timestamp / asset.fps;
            commentsResult.push({
                commentId: comment.id,
                timecodeSeconds: timecodeSeconds,
                timecode: comment.timestamp
                    ? helpers.formatTimecode(timecodeSeconds)
                    : null,
                text: comment.text,
                createdAt: comment.inserted_at,
                updatedAt: comment.updated_at,
                assetId: asset.assetId,
                asset: { name: asset.name, assetId: asset.assetId },
                leftByEmail: comment.owner?.email,
                leftBy: comment.owner?.name,
                hasReplies: comment.has_replies,
                completed: comment.completed,
                replyingTo: comment.parent_id
                    ? {
                          commentId: comment.parent_id,
                          text: "Comment text not found",
                      }
                    : null,
                isAReply: comment.parent_id !== null,
            });
        }
        for (let comment of commentsResult) {
            if (comment.hasReplies) {
                comment.replies = commentsResult
                    .filter(
                        (c) => c.replyingTo?.commentId === comment.commentId
                    )
                    .map((c) => ({ commentId: c.commentId, text: c.text }));
            }
        }
    }
    return { result: commentsResult };
}

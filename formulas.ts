import * as coda from "@codahq/packs-sdk";
import * as constants from "./constants";
import * as helpers from "./helpers";

/* -------------------------------------------------------------------------- */
/*                                    TEAMS                                   */
/* -------------------------------------------------------------------------- */

export async function syncTeams(context: coda.SyncExecutionContext) {
    let url = coda.withQueryParams(constants.BASE_URL + "/teams", {
        page_size: 9999,
    });

    let response = await context.fetcher.fetch({
        method: "GET",
        url: url,
    });

    let teams = [];
    for (let team of response.body) {
        teams.push({
            teamId: team.id,
            name: team.name,
            storageUsed: team.storage / 1000000000,
            storageLimit: team.storage_limit / 1000000000,
            link: team.link,
            slackWebhook: team.slack_webhook,
            logo: team.team_image,
            projectCount: team.project_count,
        });
    }

    return { result: teams };
}

/* -------------------------------------------------------------------------- */
/*                                  PROJECTS                                  */
/* -------------------------------------------------------------------------- */

function processProjectResponse(response): {
    name: string;
    projectId: string;
    teamId: string;
    rootAssetId: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    fileCount: number;
    folderCount: number;
} {
    return {
        name: response.name,
        projectId: response.id,
        teamId: response.team_id,
        rootAssetId: response.root_asset_id,
        createdAt: response.inserted_at,
        updatedAt: response.updated_at,
        url: "https://app.frame.io/projects/" + response.id,
        fileCount: response.file_count,
        folderCount: response.folder_count,
    };
}

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

    // We used to just gobble up everything but then started hitting 4MB response
    // size limits. So now we're using continuations. It's a bit messy cause we're
    // potentially sipping from multiple teams each continuation, but I think that's
    // ok? Worst case the user has to sort their sync table by something other than
    // the default row order to avoid multiple teams' results being interleaved.

    let perPage = 100;
    // If there's a page number in the continuation, use it. Otherwise, start at 1.
    let pageNumber: number = (context.sync.continuation?.page as number) || 1;
    // Initialize morePages to false and let any team who has more pages go ahead and
    // override it to true if they like.
    let morePages = false;

    let projects = [];
    for (let teamId of teamIds) {
        let url = coda.withQueryParams(
            constants.BASE_URL + "/teams/" + teamId + "/projects",
            { page_size: perPage, page: pageNumber }
        );
        let teamProjectsResponse = await context.fetcher.fetch({
            method: "GET",
            url: url,
        });
        for (let project of teamProjectsResponse.body) {
            projects.push(processProjectResponse(project));
        }
        if (projects.length >= perPage) {
            console.log("Team " + teamId + " has more pages");
            morePages = true;
        }
    }

    let nextContinuation;
    if (morePages) {
        nextContinuation = { page: pageNumber + 1 };
    }

    return {
        result: projects,
        continuation: nextContinuation,
    };
}

export async function updateProject(
    context: coda.ExecutionContext,
    projectId: String,
    name: String
) {
    let response = await context.fetcher.fetch({
        method: "PUT",
        url: constants.BASE_URL + "/projects/" + projectId,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: name,
        }),
    });
    let project = response.body;
    return {
        result: processProjectResponse(project),
    };
}

/* -------------------------------------------------------------------------- */
/*                                REVIEW LINKS                                */
/* -------------------------------------------------------------------------- */

function processReviewLinkResponse(responseBody): {
    name: string;
    url: string;
    reviewLinkId: string;
    projectId: string;
    createdAt: string;
    viewCount: number;
    assets: Array<{
        assetId: string;
        name: string;
    }>;
    allowDownloading: boolean;
    isActive: boolean;
    viewAllVersions: boolean;
} {
    let assets = [];
    for (let asset of responseBody.items) {
        assets.push({
            assetId: asset.asset_id,
            name: "Not found",
        });
    }

    return {
        name: responseBody.name,
        url: responseBody.short_url,
        reviewLinkId: responseBody.id,
        projectId: responseBody.project_id,
        createdAt: responseBody.inserted_at,
        viewCount: responseBody.view_count,
        assets: assets,
        allowDownloading: responseBody.enable_downloading,
        isActive: responseBody.is_active,
        viewAllVersions: !responseBody.current_version_only,
    };
}

export async function syncReviewLinks(
    context: coda.SyncExecutionContext,
    projectId: String
) {
    let url = coda.withQueryParams(
        constants.BASE_URL + "/projects/" + projectId + "/review_links",
        { page_size: 9999 }
    );
    let response = await context.fetcher.fetch({
        method: "GET",
        url: url,
    });

    let results = [];

    for (let reviewLink of response.body) {
        results.push(processReviewLinkResponse(reviewLink));
    }

    return { result: results };
}

export async function updateReviewLink(
    context: coda.ExecutionContext,
    reviewLinkId: String,
    name?: String,
    allowDownloading?: Boolean,
    isActive?: Boolean,
    viewAllVersions?: Boolean
) {
    let body: any = {};
    if (name) {
        body.name = name;
    }
    if (allowDownloading !== undefined) {
        body.enable_downloading = allowDownloading;
    }
    if (isActive !== undefined) {
        body.is_active = isActive;
    }
    if (viewAllVersions !== undefined) {
        body.current_version_only = !viewAllVersions;
    }

    let response = await context.fetcher.fetch({
        method: "PUT",
        url: constants.BASE_URL + "/review_links/" + reviewLinkId,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    let result = processReviewLinkResponse(response.body);

    return { result: result };
}

/* -------------------------------------------------------------------------- */
/*                                   ASSETS                                   */
/* -------------------------------------------------------------------------- */

async function getAssetChildren(
    context: coda.SyncExecutionContext,
    assetId: string
) {
    let url = coda.withQueryParams(
        constants.BASE_URL + "/assets/" + assetId + "/children",
        { page_size: 9999 }
    );
    let assetResponse = await context.fetcher.fetch({
        method: "GET",
        url: url,
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
                name: "Not synced", // this is just a placeholder; it'll probably be found and populate
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
            url: "https://app.frame.io/player/" + asset.id,
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

        console.log(
            "Layer of containers. Container list: " +
                containersToFetch.map((c) => c.name)
        );

        // fetch the children of all these containers, in parallel
        let requests = [];
        for (let container of containersToFetch) {
            let containerRequest = getAssetChildren(context, container.assetId);
            requests.push(containerRequest);
        }
        containerResults = await Promise.all(requests);

        // flatten out, cause it's an array of arrays, with assets
        // grouped in an array per parent
        containerResults = containerResults.flat(1);

        // add the elements of containerResults to result
        result = result.concat(...containerResults);
        // reassign containers to be any of these new assets that have children,
        // so we can go through again and get *their* children
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

    // Set up for parallelizing the requests
    let requests = [];

    // Queue up the requests
    for (let asset of assets) {
        let url = coda.withQueryParams(
            constants.BASE_URL + "/assets/" + asset.assetId + "/comments",
            { page_size: 9999 }
        );
        let request = context.fetcher.fetch({
            method: "GET",
            url: url,
        });
        requests.push(request);
    }
    let responses = await Promise.all(requests);

    let commentsResult = [];
    for (let commentResponse of responses) {
        for (let comment of commentResponse.body) {
            let asset = assets.find(
                (asset) => asset.assetId == comment.asset_id
            );
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
                          text: "Comment text not synced",
                      }
                    : null,
                isAReply: comment.parent_id !== null,
            });
        }

        // Thread in replies
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

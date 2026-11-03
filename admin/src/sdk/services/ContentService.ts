/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Author } from '../models/Author';
import type { AuthorDto } from '../models/AuthorDto';
import type { AuthorInputDto } from '../models/AuthorInputDto';
import type { ContentImportResultDto } from '../models/ContentImportResultDto';
import type { ContentImportUploadDto } from '../models/ContentImportUploadDto';
import type { FetchCodeDto } from '../models/FetchCodeDto';
import type { FetchedCodeDto } from '../models/FetchedCodeDto';
import type { HomeDto } from '../models/HomeDto';
import type { MediaAltDto } from '../models/MediaAltDto';
import type { MediaItemDto } from '../models/MediaItemDto';
import type { MediaListDto } from '../models/MediaListDto';
import type { MediaUploadDto } from '../models/MediaUploadDto';
import type { MediaUsageDto } from '../models/MediaUsageDto';
import type { OkDto } from '../models/OkDto';
import type { PageDto } from '../models/PageDto';
import type { PageInputDto } from '../models/PageInputDto';
import type { PostDetailDto } from '../models/PostDetailDto';
import type { PostInputDto } from '../models/PostInputDto';
import type { PostListDto } from '../models/PostListDto';
import type { PreviewLinkDto } from '../models/PreviewLinkDto';
import type { SiteSettingsDto } from '../models/SiteSettingsDto';
import type { Topic } from '../models/Topic';
import type { TopicDto } from '../models/TopicDto';
import type { TopicInputDto } from '../models/TopicInputDto';
import type { ValidateBodyDto } from '../models/ValidateBodyDto';
import type { ValidateBodyResultDto } from '../models/ValidateBodyResultDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ContentService {
    /**
     * @returns PostListDto
     * @throws ApiError
     */
    public static contentControllerListPosts({
        page = 1,
        pageSize = 50,
        q,
        status,
    }: {
        page?: number,
        pageSize?: number,
        q?: string,
        status?: 'draft' | 'published' | 'scheduled',
    }): CancelablePromise<PostListDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/posts',
            query: {
                'page': page,
                'pageSize': pageSize,
                'q': q,
                'status': status,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PostDetailDto
     * @throws ApiError
     */
    public static contentControllerCreatePost({
        requestBody,
    }: {
        requestBody: PostInputDto,
    }): CancelablePromise<PostDetailDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/posts',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PostDetailDto
     * @throws ApiError
     */
    public static contentControllerGetPost({
        id,
    }: {
        id: number,
    }): CancelablePromise<PostDetailDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/posts/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PostDetailDto
     * @throws ApiError
     */
    public static contentControllerUpdatePost({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: PostInputDto,
    }): CancelablePromise<PostDetailDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/content/posts/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static contentControllerRemovePost({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/content/posts/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PostDetailDto
     * @throws ApiError
     */
    public static contentControllerPublish({
        id,
    }: {
        id: number,
    }): CancelablePromise<PostDetailDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/posts/{id}/publish',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PostDetailDto
     * @throws ApiError
     */
    public static contentControllerUnpublish({
        id,
    }: {
        id: number,
    }): CancelablePromise<PostDetailDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/posts/{id}/unpublish',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PreviewLinkDto
     * @throws ApiError
     */
    public static contentControllerPreviewLink({
        id,
    }: {
        id: number,
    }): CancelablePromise<PreviewLinkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/posts/{id}/preview-link',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns binary The post as .md (no images) or .zip (index.md + assets/)
     * @throws ApiError
     */
    public static contentControllerExportPost({
        id,
    }: {
        id: number,
    }): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/posts/{id}/export',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns ValidateBodyResultDto
     * @throws ApiError
     */
    public static contentControllerValidate({
        requestBody,
    }: {
        requestBody: ValidateBodyDto,
    }): CancelablePromise<ValidateBodyResultDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/validate-body',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns FetchedCodeDto
     * @throws ApiError
     */
    public static contentControllerFetchCode({
        requestBody,
    }: {
        requestBody: FetchCodeDto,
    }): CancelablePromise<FetchedCodeDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/fetch-code',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns TopicDto
     * @throws ApiError
     */
    public static contentControllerListTopics(): CancelablePromise<Array<TopicDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/topics',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns Topic
     * @throws ApiError
     */
    public static contentControllerCreateTopic({
        requestBody,
    }: {
        requestBody: TopicInputDto,
    }): CancelablePromise<Topic> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/topics',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns Topic
     * @throws ApiError
     */
    public static contentControllerUpdateTopic({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: TopicInputDto,
    }): CancelablePromise<Topic> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/content/topics/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static contentControllerRemoveTopic({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/content/topics/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns AuthorDto
     * @throws ApiError
     */
    public static contentControllerListAuthors(): CancelablePromise<Array<AuthorDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/authors',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns Author
     * @throws ApiError
     */
    public static contentControllerCreateAuthor({
        requestBody,
    }: {
        requestBody: AuthorInputDto,
    }): CancelablePromise<Author> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/authors',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns Author
     * @throws ApiError
     */
    public static contentControllerUpdateAuthor({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: AuthorInputDto,
    }): CancelablePromise<Author> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/content/authors/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static contentControllerRemoveAuthor({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/content/authors/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PageDto
     * @throws ApiError
     */
    public static contentControllerListPages(): CancelablePromise<Array<PageDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/pages',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PageDto
     * @throws ApiError
     */
    public static contentControllerCreatePage({
        requestBody,
    }: {
        requestBody: PageInputDto,
    }): CancelablePromise<PageDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/pages',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PageDto
     * @throws ApiError
     */
    public static contentControllerGetPage({
        id,
    }: {
        id: number,
    }): CancelablePromise<PageDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/pages/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns PageDto
     * @throws ApiError
     */
    public static contentControllerUpdatePage({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: PageInputDto,
    }): CancelablePromise<PageDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/content/pages/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static contentControllerRemovePage({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/content/pages/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns SiteSettingsDto
     * @throws ApiError
     */
    public static contentControllerGetSite(): CancelablePromise<SiteSettingsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/site',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns SiteSettingsDto
     * @throws ApiError
     */
    public static contentControllerSaveSite({
        requestBody,
    }: {
        requestBody: SiteSettingsDto,
    }): CancelablePromise<SiteSettingsDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/content/site',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns HomeDto
     * @throws ApiError
     */
    public static contentControllerGetHome(): CancelablePromise<HomeDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/home',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns HomeDto
     * @throws ApiError
     */
    public static contentControllerSaveHome({
        requestBody,
    }: {
        requestBody: HomeDto,
    }): CancelablePromise<HomeDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/content/home',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns MediaListDto
     * @throws ApiError
     */
    public static contentControllerListMedia({
        page = 1,
        pageSize = 50,
        q,
    }: {
        page?: number,
        pageSize?: number,
        q?: string,
    }): CancelablePromise<MediaListDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/media',
            query: {
                'page': page,
                'pageSize': pageSize,
                'q': q,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns MediaItemDto
     * @throws ApiError
     */
    public static contentControllerUpload({
        formData,
    }: {
        formData: MediaUploadDto,
    }): CancelablePromise<MediaItemDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/media',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns MediaItemDto
     * @throws ApiError
     */
    public static contentControllerUpdateMedia({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: MediaAltDto,
    }): CancelablePromise<MediaItemDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/content/media/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static contentControllerRemoveMedia({
        id,
    }: {
        id: string,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/content/media/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns MediaUsageDto
     * @throws ApiError
     */
    public static contentControllerMediaUsage({
        id,
    }: {
        id: string,
    }): CancelablePromise<MediaUsageDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/media/{id}/usage',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns binary A .zip of Markdown files, YAML and images
     * @throws ApiError
     */
    public static contentControllerExportAll({
        include,
        status = 'all',
    }: {
        /**
         * Comma-separated: posts, topics, authors, pages, settings (default all)
         */
        include?: string,
        status?: 'all' | 'published',
    }): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/content/export',
            query: {
                'include': include,
                'status': status,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns ContentImportResultDto
     * @throws ApiError
     */
    public static contentControllerImport({
        formData,
        dryRun = true,
        onConflict = 'skip',
        asDraft = false,
    }: {
        formData: ContentImportUploadDto,
        /**
         * Only check and report; change nothing
         */
        dryRun?: boolean,
        onConflict?: 'skip' | 'overwrite',
        /**
         * Import every post as a draft
         */
        asDraft?: boolean,
    }): CancelablePromise<ContentImportResultDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/content/import',
            query: {
                'dryRun': dryRun,
                'onConflict': onConflict,
                'asDraft': asDraft,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
}

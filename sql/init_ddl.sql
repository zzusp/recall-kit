--
-- 首先安装拓展。安装拓展前，需确保postgresql数据库已经安装pgvector组件！！！
--
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    api_key character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_keys OWNER TO root;

--
-- Name: TABLE api_keys; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.api_keys IS 'API密钥表：存储用户的API访问密钥信息';


--
-- Name: COLUMN api_keys.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN api_keys.user_id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.user_id IS '拥有此API密钥的用户ID，关联users表';


--
-- Name: COLUMN api_keys.name; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.name IS 'API密钥的名称，便于识别和管理';


--
-- Name: COLUMN api_keys.api_key; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.api_key IS 'API密钥的完整值';


--
-- Name: COLUMN api_keys.is_active; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.is_active IS 'API密钥是否处于活跃状态';


--
-- Name: COLUMN api_keys.last_used_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.last_used_at IS 'API密钥最后使用时间';


--
-- Name: COLUMN api_keys.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.created_at IS 'API密钥创建时间';


--
-- Name: COLUMN api_keys.updated_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.api_keys.updated_at IS 'API密钥最后更新时间';

--
-- Name: experience_records; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.experience_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    title character varying(500) NOT NULL,
    problem_description text NOT NULL,
    root_cause text,
    solution text NOT NULL,
    context text,
    query_count integer DEFAULT 0 NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    fts tsvector,
    embedding public.vector(1024),
    has_embedding boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(6) with time zone,
    publish_status character varying(20) DEFAULT 'published'::character varying NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT check_publish_status CHECK (((publish_status)::text = ANY (ARRAY[('published'::character varying)::text, ('draft'::character varying)::text, ('publishing'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.experience_records OWNER TO root;

--
-- Name: TABLE experience_records; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.experience_records IS '经验记录表：存储用户分享的技术经验和解决方案';


--
-- Name: COLUMN experience_records.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN experience_records.user_id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.user_id IS '提交经验的用户ID，关联users表';


--
-- Name: COLUMN experience_records.title; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.title IS '经验标题';


--
-- Name: COLUMN experience_records.problem_description; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.problem_description IS '问题描述，详细说明遇到的问题';


--
-- Name: COLUMN experience_records.root_cause; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.root_cause IS '问题根本原因分析';


--
-- Name: COLUMN experience_records.solution; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.solution IS '解决方案，详细描述解决问题的方法';


--
-- Name: COLUMN experience_records.context; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.context IS '上下文信息，提供相关背景和环境';


--
-- Name: COLUMN experience_records.query_count; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.query_count IS '查询次数统计';


--
-- Name: COLUMN experience_records.view_count; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.view_count IS '查看次数统计';


--
-- Name: COLUMN experience_records.fts; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.fts IS '全文搜索向量，用于快速检索';


--
-- Name: COLUMN experience_records.embedding; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.embedding IS '文本嵌入向量，用于语义搜索，1024维度';


--
-- Name: COLUMN experience_records.has_embedding; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.has_embedding IS '是否有文本嵌入向量的标记';


--
-- Name: COLUMN experience_records.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.created_at IS '经验记录创建时间';


--
-- Name: COLUMN experience_records.updated_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.updated_at IS '经验记录最后更新时间';


--
-- Name: COLUMN experience_records.deleted_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.deleted_at IS '软删除时间戳';


--
-- Name: COLUMN experience_records.publish_status; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.publish_status IS '发布状态：draft、publishing、published、rejected';


--
-- Name: COLUMN experience_records.is_deleted; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.is_deleted IS '删除标记，true表示已删除';


--
-- Name: COLUMN experience_records.keywords; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.experience_records.keywords IS '经验关键字数组，用于存储经验的关键字标签';


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    resource character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    description text,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO root;

--
-- Name: TABLE permissions; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.permissions IS '权限表：定义系统中可用的各种权限';


--
-- Name: COLUMN permissions.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.permissions.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN permissions.name; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.permissions.name IS '权限名称';


--
-- Name: COLUMN permissions.resource; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.permissions.resource IS '权限控制的资源类型';


--
-- Name: COLUMN permissions.action; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.permissions.action IS '权限允许的操作类型';


--
-- Name: COLUMN permissions.description; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.permissions.description IS '权限描述说明';


--
-- Name: COLUMN permissions.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.permissions.created_at IS '权限创建时间';


--
-- Name: COLUMN permissions.updated_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.permissions.updated_at IS '权限最后更新时间';


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid,
    permission_id uuid,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO root;

--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.role_permissions IS '角色权限关联表：定义角色与权限的多对多关系';


--
-- Name: COLUMN role_permissions.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.role_permissions.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN role_permissions.role_id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.role_permissions.role_id IS '角色ID，关联roles表';


--
-- Name: COLUMN role_permissions.permission_id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.role_permissions.permission_id IS '权限ID，关联permissions表';


--
-- Name: COLUMN role_permissions.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.role_permissions.created_at IS '关联关系创建时间';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_system_role boolean DEFAULT false,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO root;

--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.roles IS '角色表：定义系统中的用户角色';


--
-- Name: COLUMN roles.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.roles.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN roles.name; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.roles.name IS '角色名称';


--
-- Name: COLUMN roles.description; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.roles.description IS '角色描述说明';


--
-- Name: COLUMN roles.is_system_role; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.roles.is_system_role IS '是否为系统内置角色';


--
-- Name: COLUMN roles.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.roles.created_at IS '角色创建时间';


--
-- Name: COLUMN roles.updated_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.roles.updated_at IS '角色最后更新时间';


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO root;

--
-- Name: TABLE system_settings; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.system_settings IS '系统设置表：存储系统的配置参数和设置';


--
-- Name: COLUMN system_settings.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.system_settings.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN system_settings.setting_key; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.system_settings.setting_key IS '设置键名，唯一标识配置项';


--
-- Name: COLUMN system_settings.setting_value; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.system_settings.setting_value IS '设置值，JSON格式存储配置数据';


--
-- Name: COLUMN system_settings.description; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.system_settings.description IS '设置项描述说明';


--
-- Name: COLUMN system_settings.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.system_settings.created_at IS '设置创建时间';


--
-- Name: COLUMN system_settings.updated_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.system_settings.updated_at IS '设置最后更新时间';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    role_id uuid,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO root;

--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.user_roles IS '用户角色关联表：定义用户与角色的多对多关系';


--
-- Name: COLUMN user_roles.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_roles.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN user_roles.user_id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_roles.user_id IS '用户ID，关联users表';


--
-- Name: COLUMN user_roles.role_id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_roles.role_id IS '角色ID，关联roles表';


--
-- Name: COLUMN user_roles.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_roles.created_at IS '关联关系创建时间';


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_token character varying(255) NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_sessions OWNER TO root;

--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.user_sessions IS '用户会话表：管理用户的登录会话信息';


--
-- Name: COLUMN user_sessions.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_sessions.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN user_sessions.user_id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_sessions.user_id IS '用户ID，关联users表';


--
-- Name: COLUMN user_sessions.session_token; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_sessions.session_token IS '会话令牌';


--
-- Name: COLUMN user_sessions.expires_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_sessions.expires_at IS '会话过期时间';


--
-- Name: COLUMN user_sessions.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.user_sessions.created_at IS '会话创建时间';


--
-- Name: users; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    is_superuser boolean DEFAULT false,
    last_login_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    last_password_change timestamp(6) with time zone
);


ALTER TABLE public.users OWNER TO root;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON TABLE public.users IS '用户表：存储系统用户的基本信息和认证数据';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.id IS '主键ID，使用UUID格式';


--
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.username IS '用户名，唯一标识';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.email IS '用户邮箱地址，唯一标识';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.password_hash IS '密码哈希值，用于身份验证';


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.is_active IS '账户是否处于活跃状态';


--
-- Name: COLUMN users.is_superuser; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.is_superuser IS '是否为超级管理员';


--
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.created_at IS '用户账户创建时间';


--
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.updated_at IS '用户信息最后更新时间';


--
-- Name: COLUMN users.last_password_change; Type: COMMENT; Schema: public; Owner: root
--

COMMENT ON COLUMN public.users.last_password_change IS '密码最后修改时间';

--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (api_key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: experience_records experience_records_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.experience_records
    ADD CONSTRAINT experience_records_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: permissions unique_permission; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT unique_permission UNIQUE (resource, action);


--
-- Name: role_permissions unique_role_permission; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id);


--
-- Name: user_roles unique_user_role; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT unique_user_role UNIQUE (user_id, role_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_api_keys_api_key; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_api_keys_api_key ON public.api_keys USING btree (api_key);


--
-- Name: idx_api_keys_is_active; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_api_keys_is_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_experience_records_created_at; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_created_at ON public.experience_records USING btree (created_at DESC);


--
-- Name: idx_experience_records_embedding; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_embedding ON public.experience_records USING hnsw (embedding public.vector_cosine_ops) WHERE (((publish_status)::text = 'published'::text) AND (is_deleted = false) AND (embedding IS NOT NULL));


--
-- Name: idx_experience_records_fts; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_fts ON public.experience_records USING gin (fts);


--
-- Name: idx_experience_records_has_embedding; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_has_embedding ON public.experience_records USING btree (has_embedding) WHERE (has_embedding = true);


--
-- Name: idx_experience_records_is_deleted; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_is_deleted ON public.experience_records USING btree (is_deleted);


--
-- Name: idx_experience_records_publish_status; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_publish_status ON public.experience_records USING btree (publish_status);


--
-- Name: idx_experience_records_published; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_published ON public.experience_records USING btree (publish_status, is_deleted) WHERE (((publish_status)::text = 'published'::text) AND (is_deleted = false));


--
-- Name: idx_experience_records_query_count; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_query_count ON public.experience_records USING btree (query_count DESC);


--
-- Name: idx_experience_records_search; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_search ON public.experience_records USING gin (to_tsvector('english'::regconfig, (((((((((COALESCE(title, ''::character varying))::text || ' '::text) || COALESCE(problem_description, ''::text)) || ' '::text) || COALESCE(root_cause, ''::text)) || ' '::text) || COALESCE(solution, ''::text)) || ' '::text) || COALESCE(context, ''::text))));


--
-- Name: idx_experience_records_user_id; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_user_id ON public.experience_records USING btree (user_id);

--
-- Name: idx_experience_records_keywords; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_experience_records_keywords ON public.experience_records USING GIN (keywords);


--
-- Name: idx_permissions_action; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_permissions_action ON public.permissions USING btree (action);


--
-- Name: idx_permissions_created_at; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_permissions_created_at ON public.permissions USING btree (created_at DESC);


--
-- Name: idx_permissions_name; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_permissions_name ON public.permissions USING btree (name);


--
-- Name: idx_permissions_resource; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_permissions_resource ON public.permissions USING btree (resource);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_roles_created_at; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_roles_created_at ON public.roles USING btree (created_at DESC);


--
-- Name: idx_roles_is_system_role; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_roles_is_system_role ON public.roles USING btree (is_system_role);


--
-- Name: idx_roles_name; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_roles_name ON public.roles USING btree (name);


--
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_token; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (session_token);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


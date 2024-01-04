<template>
    <Form
        :model="formState"
        :label-col="{ span: 8 }"
        :wrapper-col="{ span: 16 }"
        autocomplete="off"
        @finish="onFinish"
    >
        <FormItem
            label="UID"
            name="uid"
        >
            <Input v-model:value="formState.uid" />
        </FormItem>

        <FormItem
            label="落位类目"
            name="type"
        >
            <Input v-model:value="formState.type" />
        </FormItem>

        <FormItem
            label="旋转角度"
            name="angle"
            :rules="[{ required: true, message: '请输入旋转角度' }]"
        >
            <Input v-model:value="formState.angle" />
        </FormItem>

        <FormItem :wrapper-col="{ offset: 8, span: 16 }">
            <Button type="primary" html-type="submit">保存</Button>
        </FormItem>
    </Form>
</template>

<script setup lang="ts">
    import { reactive, watch } from 'vue';
    import { Button, Form, FormItem, Input } from 'ant-design-vue';

    const emit = defineEmits(['success']);
    const props = defineProps<{
        uid?: string,
        type?: string,
        angle?: number | string,
    }>();

    watch(
        () => props,
        (val) => {
            formState.uid = val.uid;
            formState.type = val.type;
            formState.angle = val.angle ?? 0;
            // TODO：如果UID存在，则调用接口获取此uid的信息展示
        },
        { deep: true }
    );

    const formState = reactive<FormState>({
        uid: '',
        type: '',
        angle: 0,
    });

    // 保存
    const onFinish = (values: FormState) => {
        emit('success', values)
    };
  
</script>
  